// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
import "./ImportArtifacts.sol";

import "./interfaces/IUniswap.sol";

/**
 * A Token-based paymaster.
 * - each request is paid for by the caller.
 * - preRelayedCall - pre-pay the maximum possible price for the tx
 * - postRelayedCall - refund the caller for the unused gas
 */
contract TokenPaymasterPermitPaymaster is BasePaymaster {

    mapping(address => address) public routersMap;

    uint256 public gasUsedByPost;

    event TokensCharged(
        uint256 gasUseWithoutPost,
        uint256 gasUsedByPost,
        uint256 ethActualCharge,
        uint256 tokenActualCharge
    );
    event TokensPrecharged(address token, address router, uint256 tokenPrecharge);
    event Received(uint256 eth);

    constructor() {}

    function setPostGasUsage(uint256 _gasUsedByPost) external onlyOwner {
        gasUsedByPost = _gasUsedByPost;
    }

    function getPayer(GsnTypes.RelayRequest calldata relayRequest) public view virtual returns (address) {
        (this);
        return relayRequest.request.from;
    }

    function calculatePreCharge(
        IERC20 token,
        IUniswap router,
        GsnTypes.RelayRequest calldata relayRequest,
        uint256 maxPossibleGas
    ) public view returns (address payer, uint256 tokenPreCharge) {
        payer = this.getPayer(relayRequest);
        uint256 ethMaxCharge = relayHub.calculateCharge(maxPossibleGas, relayRequest.relayData);
        ethMaxCharge += relayRequest.request.value;
        tokenPreCharge = getTokenToEthOutputPrice(ethMaxCharge, token, router);
        require(tokenPreCharge <= token.balanceOf(payer), "token balance too low");
    }

    function preRelayedCall(
        GsnTypes.RelayRequest calldata relayRequest,
        bytes calldata signature,
        bytes calldata approvalData,
        uint256 maxPossibleGas
    ) external virtual override relayHubOnly returns (bytes memory context, bool revertOnRecipientRevert) {
        (relayRequest, signature, approvalData, maxPossibleGas);

        (IERC20 token, IUniswap router) = _getToken(relayRequest.relayData.paymasterData);
        (address payer, uint256 tokenPrecharge) = calculatePreCharge(token, router, relayRequest, maxPossibleGas);

        if (approvalData.length > 5) {
            (address owner, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) = abi.decode(
                approvalData,
                (address, uint256, uint256, uint8, bytes32, bytes32)
            );
            IERC20Permit(address(token)).permit(owner, address(this), value, deadline, v, r, s);
        }

        token.transferFrom(payer, address(this), tokenPrecharge);

        emit TokensPrecharged(address(token), address(router), tokenPrecharge);

        return (abi.encode(payer, tokenPrecharge, token, router), false);
    }

    function postRelayedCall(
        bytes calldata context,
        bool success,
        uint256 gasUseWithoutPost,
        GsnTypes.RelayData calldata relayData
    ) external virtual override relayHubOnly {
        success; // remove warning

        (address payer, uint256 tokenPrecharge, IERC20 token, IUniswap router) = abi.decode(
            context,
            (address, uint256, IERC20, IUniswap)
        );
        _postRelayedCallInternal(payer, tokenPrecharge, 0, gasUseWithoutPost, relayData, token, router);
    }

    function getTokenBalance(IERC20 token) external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function withdrawToken(
        IERC20 token,
        address account,
        uint256 amount
    ) external onlyOwner() {
        uint256 tokenBalance = token.balanceOf(address(this));
        require(amount <= tokenBalance, "TokenPaymaster/Balance to low.");

        token.transfer(account, amount);
    }

    function _postRelayedCallInternal(
        address _payer,
        uint256 _tokenPrecharge,
        uint256 _valueRequested,
        uint256 _gasUseWithoutPost,
        GsnTypes.RelayData calldata _relayData,
        IERC20 _token,
        IUniswap _router
    ) internal {
        uint256 ethActualCharge = relayHub.calculateCharge(_gasUseWithoutPost + gasUsedByPost, _relayData);
        uint256 tokenActualCharge = getTokenToEthOutputPrice(_valueRequested + ethActualCharge, _token, _router);
        uint256 tokenRefund = _tokenPrecharge - tokenActualCharge;
        _refundPayer(_payer, _token, tokenRefund);
        _depositProceedsToHub(ethActualCharge, tokenActualCharge, _token, _router);

        emit TokensCharged(_gasUseWithoutPost, gasUsedByPost, ethActualCharge, tokenActualCharge);
    }

    function _refundPayer(
        address payer,
        IERC20 token,
        uint256 tokenRefund
    ) private {
        require(token.transfer(payer, tokenRefund), "failed refund");
    }

    // token must have pool with wrapped native currency
    function _depositProceedsToHub(
        uint256 ethActualCharge,
        uint256 tokenActualCharge,
        IERC20 token,
        IUniswap router
    ) private {
        //solhint-disable-next-line
        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = router.WETH();
        token.approve(address(router), type(uint256).max);
        router.swapExactTokensForETH(
            tokenActualCharge,
            ethActualCharge,
            path,
            address(this),
            block.timestamp + 60 * 15
        );
        IRelayHub(address(relayHub)).depositFor{ value: ethActualCharge }(address(this));
    }

    // todo move in prod to internal
    // @param router - is just router with uniswap like interface, it may be not a uniswap
    function _getToken(bytes memory paymasterData) public view returns (IERC20, IUniswap) {
        address token = abi.decode(paymasterData, (address));
        address router = routersMap[token];
        require(token != address(0), "This token not supported as fee");
        require(router != address(0), "Does't supported pool");

        return (IERC20(token), IUniswap(router));
    }

    // router can be overwritten
    function addToken(address token, address router) external onlyOwner {
        routersMap[token] = router;
    }

    // routers can be overwritten
    // len(tokens) must be equal to len(routers)
    function addBatchTokens(address[] memory tokens, address[] memory routers) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            routersMap[tokens[i]] = routers[i];
        }
    }

    function getGasAndDataLimits() public view virtual override returns (IPaymaster.GasAndDataLimits memory limits) {
        return IPaymaster.GasAndDataLimits(250000, 200000, 210000, CALLDATA_SIZE_LIMIT);
    }

    // token must have pool with wrapped native currency
    function getTokenToEthOutputPrice(
        uint256 ethValue,
        IERC20 token,
        IUniswap router
    ) internal view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = router.WETH();
        uint256[] memory amountOuts = router.getAmountsIn(ethValue, path);
        return amountOuts[0];
    }

    function versionPaymaster() external view virtual override returns (string memory) {
        return "2.2.0";
    }

    receive() external payable override {
        emit Received(msg.value);
    }
}
