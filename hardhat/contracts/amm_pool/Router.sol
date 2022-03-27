// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-newone/utils/Address.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";

interface IPortal {
    struct PermitData {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 deadline;
        bool approveMax;
    }
    struct SynthParams {
        address chain2address;
        address receiveSide;
        address oppositeBridge;
        uint256 chainID;
    }

    function synthesize(
        address token,
        uint256 amount,
        address from,
        address to,
        address receiveSide,
        address oppositeBridge,
        uint256 chainID
    ) external;

    function synthesizeWithPermit(
        PermitData memory permitData,
        address token,
        uint256 amount,
        address to,
        address receiveSide,
        address oppositeBridge,
        uint256 chainID
    ) external;

    function synthesizeToSolana(
        address token,
        uint256 amount,
        bytes32[] calldata pubkeys,
        bytes1 txStateBump,
        uint256 chainId
    ) external;

    function synthesize_batch_transit(
        address[] memory token,
        uint256[] memory amount, // set a positive amount in order to initiate a synthesize request
        SynthParams memory synthparams,
        bytes4 selector,
        bytes calldata transit_data,
        PermitData[] memory permit_data
    ) external;
}

interface ICurveProxy {
    struct PermitData {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 deadline;
        bool approveMax;
    }

    struct MetaMintEUSD {
        //crosschain pool params
        address add_c;
        uint256 expected_min_mintamount_c;
        //incoming coin index for adding liq to hub pool
        uint256 lp_index;
        //hub pool params
        address add_h;
        uint256 expected_min_mintamount_h;
        //recipient address
        address to;
        //emergency unsynth params
        address initialBridge;
        uint256 initialChainID;
    }

    struct MetaRedeemEUSD {
        //crosschain pool params
        address remove_c;
        //outcome index
        int128 x;
        uint256 expected_minamount_c;
        //hub pool params
        address remove_h;
        uint256 token_amount_h;
        //lp index
        int128 y;
        uint256 expected_minamount_h;
        //recipient address
        address to;
    }

    struct MetaExchangeParams {
        //pool address
        address add;
        address exchange;
        address remove;
        //add liquidity params
        uint256 expected_min_mintamount;
        //exchange params
        int128 i; //index value for the coin to send
        int128 j; //index value of the coin to receive
        uint256 expected_min_dy;
        //withdraw one coin params
        int128 x; //index value of the coin to withdraw
        uint256 expected_minamount;
        //transfer to
        address to;
        //unsynth params
        address chain2address;
        address receiveSide;
        address oppositeBridge;
        uint256 chainID;
        //emergency unsynth params
        address initialBridge;
        uint256 initialChainID;
    }

    function add_liquidity_3pool_mint_eusd(
        MetaMintEUSD calldata params,
        PermitData[] calldata permit,
        address[3] calldata token,
        uint256[3] calldata amount
    ) external;

    function meta_exchange(
        MetaExchangeParams calldata params,
        PermitData[] calldata permit,
        address[3] calldata token,
        uint256[3] calldata amount
    ) external;

    function redeem_eusd(
        MetaRedeemEUSD calldata params,
        PermitData calldata permit,
        address receiveSide,
        address oppositeBridge,
        uint256 chainID
    ) external;
}

contract Router {
    using Address for address;

    address _localTreasury;
    address _curveProxy;
    address _portal;
    // mapping(address => bool) public pusher;

    event PaymentEvent(address indexed userFrom, address payToken, uint256 executionPrice, address indexed worker);

    struct DelegatedCallReceipt {
        uint256 executionPrice;
        uint256 timeout;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    constructor(
        address localTreasury,
        address portal,
        address curveProxy
    ) {
        _localTreasury = localTreasury;
        _portal = portal;
        _curveProxy = curveProxy;
    }

    // uint256 public basePercent = 1000; //10%
    // function setFee(uint256 _bp) public onlyOwner{
    //     basePercent = _bp;
    // }

    // function getTxValues(uint256 amount) public view returns (uint256 executionPrice, uint256 txFee) {
    //     // require(amount >= 10, "transfer amount is too small");
    //     txFee = (amount * basePercent) / 10000;
    //     executionPrice = amount - txFee;
    //     return (executionPrice, txFee);
    // }

    function proceedFees(
        address payToken,
        uint256 generalAmount,
        address from,
        DelegatedCallReceipt memory receipt
    ) internal {
        bytes32 structHash = keccak256(
            abi.encodePacked(payToken, receipt.executionPrice, from, msg.sender, receipt.timeout)
        );

        address sender = ECDSA.recover(ECDSA.toEthSignedMessageHash(structHash), receipt.v, receipt.r, receipt.s);

        require(sender == from, "Router: invalid signature from sender");

        // worker fee
        SafeERC20.safeTransferFrom(IERC20(payToken), from, msg.sender, receipt.executionPrice);
        // proceed remaining amount
        SafeERC20.safeTransferFrom(IERC20(payToken), from, _portal, generalAmount - receipt.executionPrice);

        emit PaymentEvent(from, payToken, receipt.executionPrice, msg.sender);
    }

    /**
     * @dev Delegated token synthesize request.
     * @param token token address to synthesize
     * @param amount amount to synthesize
     * @param from msg sender address
     * @param to amount recipient address
     * @param receiveSide request recipient address
     * @param oppositeBridge opposite bridge address
     * @param chainID opposite chain ID
     * @param receipt delegated call receipt
     */

    function delegatedTokenSynthesizeRequest(
        address token,
        uint256 amount,
        address from,
        address to,
        address receiveSide,
        address oppositeBridge,
        uint256 chainID,
        DelegatedCallReceipt memory receipt
    ) external {
        proceedFees(token, amount, from, receipt);
        IPortal(_portal).synthesize(token, amount, from, to, receiveSide, oppositeBridge, chainID);
    }

    /**
     * @dev Delegated token synthesize request with permit.
     * @param token token address to synthesize
     * @param amount amount to synthesize
     * @param to amount recipient address
     * @param receiveSide request recipient address
     * @param oppositeBridge opposite bridge address
     * @param chainID opposite chain ID
     * @param permitData permit data
     * @param receipt delegated call receipt
     */
    function delegatedTokenSynthesizeRequestWithPermit(
        address token,
        uint256 amount,
        address from,
        address to,
        address receiveSide,
        address oppositeBridge,
        uint256 chainID,
        IPortal.PermitData memory permitData,
        DelegatedCallReceipt memory receipt
    ) external {
        // SafeERC20.safeTransferFrom(IERC20(token), from, _portal, amount);
        proceedFees(token, amount, from, receipt);
        IPortal(_portal).synthesizeWithPermit(permitData, token, amount, to, receiveSide, oppositeBridge, chainID);
    }

    //----TEST------
    function delegatedTokenSynthesize1(
        address token,
        uint256 amount,
        address from,
        address to,
        address receiveSide,
        address oppositeBridge,
        uint256 chainID
    ) external {
        SafeERC20.safeTransferFrom(IERC20(token), from, _portal, amount);
        IPortal(_portal).synthesize(token, amount, from, to, receiveSide, oppositeBridge, chainID);
    }

    //------------

    /**
     * @dev  Delegated token synthesize request with bytes32 support for Solana.
     * @param token token address to synthesize
     * @param amount amount to synthesize
     * @param pubkeys synth data for Solana
     * @param txStateBump transaction state bump
     * @param chainId opposite chain ID
     * @param receipt delegated call receipt
     */
    function delegatedTokenSynthesizeRequestToSolana(
        address token,
        uint256 amount,
        address from,
        bytes32[] calldata pubkeys,
        bytes1 txStateBump,
        uint256 chainId,
        DelegatedCallReceipt memory receipt
    ) external {
        // SafeERC20.safeTransferFrom(IERC20(token), from, _portal, amount);
        proceedFees(token, amount, from, receipt);
        IPortal(_portal).synthesizeToSolana(token, amount, pubkeys, txStateBump, chainId);
    }

    /**
     * @dev  Delegated batch synthesize request with data transition.
     */
    function delegatedBatchSynthesizeRequestWithDataTransit(
        address[] memory token,
        uint256[] memory amount, // set a positive amount in order to initiate a synthesize request
        address from,
        bytes4 selector,
        bytes calldata transit_data,
        IPortal.SynthParams memory synth_params,
        IPortal.PermitData[] memory permit_data,
        DelegatedCallReceipt memory receipt
    ) external {
        for (uint256 i = 0; i < token.length; i++) {
            if (amount[i] > 0) {
                // SafeERC20.safeTransferFrom(IERC20(token[i]), from, _portal, amount[i]);
                proceedFees(token[i], amount[i], from, receipt);
            }
        }
        IPortal(_portal).synthesize_batch_transit(token, amount, synth_params, selector, transit_data, permit_data);
    }

    /**
     * @dev Delegated local mint EUSD request (hub chain execution only)
     * @param params MetaMintEUSD params
     * @param permit permit operation params
     * @param token token addresses
     * @param amount amounts to transfer
     * @param receipt delegated call receipt
     */
    function delegatedMintEusdRequestVia3pool(
        ICurveProxy.MetaMintEUSD calldata params,
        ICurveProxy.PermitData[] calldata permit,
        address from,
        address[3] calldata token,
        uint256[3] calldata amount,
        DelegatedCallReceipt memory receipt
    ) external {
        for (uint256 i = 0; i < token.length; i++) {
            if (amount[i] > 0) {
                // SafeERC20.safeTransferFrom(IERC20(token[i]), from, _portal, amount[i]);
                proceedFees(token[i], amount[i], from, receipt);
            }
        }
        ICurveProxy(_curveProxy).add_liquidity_3pool_mint_eusd(params, permit, token, amount);
    }

    /**
     * @dev Delegated local meta exchange request (hub chain execution only)
     * @param params meta exchange params
     * @param permit permit operation params
     * @param token token addresses to transfer within initial stage
     * @param amount amounts to transfer within initial stage
     * @param receipt delegated call receipt
     */
    function delegatedMetaExchangeRequestVia3pool(
        ICurveProxy.MetaExchangeParams calldata params,
        ICurveProxy.PermitData[] calldata permit,
        address from,
        address[3] calldata token,
        uint256[3] calldata amount,
        DelegatedCallReceipt memory receipt
    ) external {
        for (uint256 i = 0; i < token.length; i++) {
            if (amount[i] > 0) {
                // SafeERC20.safeTransferFrom(IERC20(token[i]), from, _portal, amount[i]);
                proceedFees(token[i], amount[i], from, receipt);
            }
        }
        ICurveProxy(_curveProxy).meta_exchange(params, permit, token, amount);
    }

    /**
     * @dev Delegated local EUSD redeem request with unsynth operation (hub chain execution only)
     * @param params meta redeem EUSD params
     * @param permit permit params
     * @param receiveSide calldata recipient address for unsynth operation
     * @param oppositeBridge opposite bridge contract address
     * @param chainID opposite chain ID
     * @param receipt delegated call receipt
     */
    function delegatedRedeemEusdRequest(
        ICurveProxy.MetaRedeemEUSD calldata params,
        ICurveProxy.PermitData calldata permit,
        address payToken,
        address from,
        address receiveSide,
        address oppositeBridge,
        uint256 chainID,
        DelegatedCallReceipt memory receipt
    ) external {
        proceedFees(payToken, params.token_amount_h, from, receipt);
        ICurveProxy(_curveProxy).redeem_eusd(params, permit, receiveSide, oppositeBridge, chainID);
    }
}
