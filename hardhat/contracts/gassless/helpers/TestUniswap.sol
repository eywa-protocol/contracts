// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
import "../interfaces/IUniswap.sol";
import "./TestToken.sol";

// naive, no-calculation swapper.
//- the exchange rate is fixed at construction
//- mints new tokens at will...
contract TestUniswap is IUniswap {
    address public immutable override WETH;
    address[] public token;
    uint256 public rateMult;
    uint256 public rateDiv;

    constructor(
        uint256 _rateMult,
        uint256 _rateDiv,
        address _WETH
    ) payable {
        rateMult = _rateMult;
        rateDiv = _rateDiv;
        require(msg.value > 0, "must specify liquidity");
        require(rateMult != 0 && rateDiv != 0, "bad mult,div");
        WETH = _WETH;
    }

    function pu(address _erc20) external {
        token.push(_erc20);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    function tokenAddress(uint256 i) external view override returns (address out) {
        return address(token[i]);
    }

    function tokenToEthSwapOutput(
        IERC20 _token,
        uint256 ethBought,
        uint256 maxTokens,
        uint256 deadline
    ) public override returns (uint256 out) {
        (maxTokens, deadline);
        uint256 tokensToSell = getTokenToEthOutputPrice(ethBought);
        require(address(this).balance > ethBought, "not enough liquidity");

        _token.transferFrom(msg.sender, address(this), tokensToSell);
        payable(msg.sender).transfer(ethBought);

        return tokensToSell;
    }

    function getTokenToEthInputPrice(uint256 tokensSold) external view override returns (uint256 out) {
        return (tokensSold * rateDiv) / rateMult;
    }

    function tokenToEthTransferOutput(
        IERC20 _token,
        uint256 ethBought,
        uint256 maxTokens,
        uint256 deadline,
        address payable recipient
    ) external override returns (uint256 out) {
        (maxTokens, deadline, recipient);
        require(address(this).balance > ethBought, "not enough liquidity");

        uint256 tokensToSell = getTokenToEthOutputPrice(ethBought);

        _token.transferFrom(msg.sender, address(this), tokensToSell);
        recipient.transfer(ethBought);

        return tokensToSell;
    }

    function getTokenToEthOutputPrice(uint256 ethBought) public view override returns (uint256 out) {
        return (ethBought * rateMult) / rateDiv;
    }

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override {
        amountIn; // remove warning
        to; // remove warning
        deadline; // remove warning

        uint256 tokensToSell = getTokenToEthOutputPrice(amountOutMin);
        require(address(this).balance > amountOutMin, "not enough liquidity");

        IERC20(path[0]).transferFrom(msg.sender, address(this), tokensToSell);
        payable(msg.sender).transfer(amountOutMin);
    }

    /** Useful for calculating optimal token amounts before calling swap. */
    function getAmountsIn(uint256 amountOut, address[] memory path)
        external
        view
        override
        returns (uint256[] memory amounts)
    {
        path; // remove warning

        uint256[] memory amount = new uint256[](2);
        amount[0] = (amountOut * rateMult) / rateDiv;
        amount[1] = 0;
        return amount;
    }
}
