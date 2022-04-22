// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/access/Ownable.sol";
import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts-newone/utils/Counters.sol";

interface IPortal {
    struct PermitData {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 deadline;
        bool approveMax;
    }

    struct TransitData {
        bytes4 selector;
        bytes data;
    }

    struct SynthParams {
        address receiveSide;
        address oppositeBridge;
        uint256 chainId;
    }

    function synthesize(
        address token,
        uint256 amount,
        address from,
        address to,
        SynthParams calldata params
    ) external;

    function synthesizeWithPermit(
        PermitData calldata permitData,
        address token,
        uint256 amount,
        address from,
        address to,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId
    ) external;

    function synthesizeToSolana(
        address token,
        uint256 amount,
        address from,
        bytes32[] calldata pubkeys,
        bytes1 txStateBump,
        uint256 chainId
    ) external;

    function synthesizeBatchWithDataTransit(
        address[] memory token,
        uint256[] memory amount,
        address from,
        address to,
        SynthParams memory synthParams,
        TransitData memory transitData
    ) external;

    function emergencyUnburnRequest(
        bytes32 txID,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function emergencyUnburnRequestToSolana(
        bytes32 txID,
        address from,
        bytes32[] calldata pubkeys,
        uint256 chainId
    ) external;
}

interface ISynthesis {
    struct SynthParams {
        address receiveSide;
        address oppositeBridge;
        uint256 chainId;
    }

    function synthTransfer(
        bytes32 tokenReal,
        uint256 amount,
        address from,
        address to,
        SynthParams calldata params
    ) external;

    function burnSyntheticToken(
        address tokenSynth,
        uint256 amount,
        address from,
        address to,
        SynthParams calldata params
    ) external;

    function burnSyntheticTokenToSolana(
        address tokenSynth,
        address from,
        bytes32[] calldata pubkeys,
        uint256 amount,
        uint256 chainId
    ) external;

    function emergencyUnsyntesizeRequest(
        bytes32 txID,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function emergencyUnsyntesizeRequestToSolana(
        address from,
        bytes32[] calldata pubkeys,
        bytes1 bumpSynthesizeRequest,
        uint256 chainId
    ) external;

    function getRepresentation(bytes32 _rtoken) external view returns (address);
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
        address addAtCrosschainPool;
        uint256 expectedMinMintAmountC;
        //incoming coin index for adding liq to hub pool
        uint256 lpIndex;
        //hub pool params
        address addAtHubPool;
        uint256 expectedMinMintAmountH;
        //recipient address
        address to;
        //emergency unsynth params
        address initialBridge;
        uint256 initialChainID;
    }

    struct MetaRedeemEUSD {
        //crosschain pool params
        address removeAtCrosschainPool;
        //outcome index
        int128 x;
        uint256 expectedMinAmountC;
        //hub pool params
        address removeAtHubPool;
        uint256 tokenAmountH;
        //lp index
        int128 y;
        uint256 expectedMinAmountH;
        //recipient address
        address to;
    }

    struct MetaExchangeParams {
        //pool address
        address add;
        address exchange;
        address remove;
        //add liquidity params
        uint256 expectedMinMintAmount;
        //exchange params
        int128 i; //index value for the coin to send
        int128 j; //index value of the coin to receive
        uint256 expectedMinDy;
        //withdraw one coin params
        int128 x; //index value of the coin to withdraw
        uint256 expectedMinAmount;
        //transfer to
        address to;
        //unsynth params
        address chain2address;
        address receiveSide;
        address oppositeBridge;
        uint256 chainId;
        //emergency unsynth params
        address initialBridge;
        uint256 initialChainID;
    }

    function addLiquidity3PoolMintEUSD(
        MetaMintEUSD calldata params,
        PermitData[] calldata permit,
        address[3] calldata token,
        uint256[3] calldata amount
    ) external;

    function metaExchange(
        MetaExchangeParams calldata params,
        PermitData[] calldata permit,
        address[3] calldata token,
        uint256[3] calldata amount
    ) external;

    function redeemEUSD(
        MetaRedeemEUSD calldata params,
        PermitData calldata permit,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId
    ) external;
}

interface IERC20Permit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

contract Router is EIP712, Ownable {
    using Counters for Counters.Counter;

    address _curveProxy;
    address _portal;
    address _synthesis;

    bytes32 public constant _SYNTHESIZE_REQUEST_SIGNATURE_HASH =
        keccak256(abi.encodePacked("synthesizeRequest(address,uint256,address,address,[address,address,uint256])"));
    bytes32 public constant _UNSYNTHESIZE_REQUEST_SIGNATURE_HASH =
        keccak256(abi.encodePacked("unsynthesizeRequest(address,uint256,address,address,[address,address,uint256])"));
    bytes32 public constant _SYNTH_TRANSFER_REQUEST_SIGNATURE_HASH =
        keccak256(abi.encodePacked("synthTransferRequest(bytes32,uint256,address,address,[address,address,uint256])"));

    mapping(address => bool) public _trustedWorker;
    mapping(address => Counters.Counter) private _nonces;

    event CrosschainPaymentEvent(address indexed userFrom, address indexed worker, uint256 executionPrice);

    struct DelegatedCallReceipt {
        uint256 executionPrice;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    constructor(
        address portal,
        address synthesis,
        address curveProxy
    ) EIP712("EYWA", "1") {
        _portal = portal;
        _synthesis = synthesis;
        _curveProxy = curveProxy;
    }

    function setTrustedWorker(address worker) public onlyOwner {
        _trustedWorker[worker] = true;
    }

    function removeTrustedWorker(address worker) public onlyOwner {
        _trustedWorker[worker] = false;
    }

    function _checkWorkerSignature(
        uint256 chainIdTo,
        bytes32 executionHash,
        DelegatedCallReceipt calldata receipt
    ) internal returns (address worker) {
        uint256 nonce = _useNonce(msg.sender);
        bytes32 workerStructHash = keccak256(
            abi.encodePacked(
                keccak256(
                    "DelegatedCallWorkerPermit(address from,uint256 chainIdTo,uint256 executionPrice,bytes32 executionHash,uint256 nonce,uint256 deadline)"
                ),
                msg.sender,
                chainIdTo,
                receipt.executionPrice,
                executionHash,
                nonce,
                receipt.deadline
            )
        );

        bytes32 workerHash = ECDSA.toEthSignedMessageHash(_hashTypedDataV4(workerStructHash));
        worker = ECDSA.recover(workerHash, receipt.v, receipt.r, receipt.s);

        require(_trustedWorker[worker], "Router: invalid signature from worker");
        require(block.timestamp <= receipt.deadline, "Router: deadline");
    }

    function _proceedFees(uint256 executionPrice, address worker) internal {
        // worker fee
        require(msg.value >= executionPrice, "Invalid amount");
        (bool sent, ) = worker.call{ value: msg.value }("");
        require(sent, "Failed to send Ether");

        emit CrosschainPaymentEvent(msg.sender, worker, executionPrice);
    }

    //==============================PORTAL==============================
    /**
     * @dev Token synthesize request to another EVM chain via native payment.
     * @param token token address to synthesize
     * @param amount amount to synthesize
     * @param to amount recipient address
     * @param synthParams synth params
     * @param receipt delegated call receipt from worker
     */
    function synthesizeRequestPayNative(
        address token,
        uint256 amount,
        address to,
        IPortal.SynthParams calldata synthParams,
        DelegatedCallReceipt calldata receipt
    ) external payable {
        address worker = _checkWorkerSignature(synthParams.chainId, _SYNTHESIZE_REQUEST_SIGNATURE_HASH, receipt);
        _proceedFees(receipt.executionPrice, worker);
        SafeERC20.safeTransferFrom(IERC20(token), msg.sender, _portal, amount);
        IPortal(_portal).synthesize(token, amount, msg.sender, to, synthParams);
    }

    /**
     * @dev Token synthesize request with permit to another EVM chain via native payment.
     * @param token token address to synthesize
     * @param amount amount to synthesize
     * @param to amount recipient address
     * @param synthParams synth params
     * @param permitData permit data
     * @param receipt delegated call receipt from worker
     */
    function synthesizeRequestWithPermitPayNative(
        address token,
        uint256 amount,
        address to,
        IPortal.SynthParams calldata synthParams,
        IPortal.PermitData calldata permitData,
        DelegatedCallReceipt calldata receipt
    ) external payable {
        address worker = _checkWorkerSignature(synthParams.chainId, _SYNTHESIZE_REQUEST_SIGNATURE_HASH, receipt);
        IERC20Permit(token).permit(
            msg.sender,
            address(this),
            permitData.approveMax ? uint256(2**256 - 1) : amount,
            permitData.deadline,
            permitData.v,
            permitData.r,
            permitData.s
        );

        _proceedFees(receipt.executionPrice, worker);
        SafeERC20.safeTransferFrom(IERC20(token), msg.sender, _portal, amount);
        IPortal(_portal).synthesize(token, amount, msg.sender, to, synthParams);
    }

    //==============================SYNTHESIS==============================
    /**
     * @dev Synthetic token transfer request to another EVM chain via native payment.
     * @param tokenReal real token address
     * @param tokenSynth synth token address
     * @param amount amount to transfer
     * @param to recipient address
     * @param synthParams synthesize parameters
     * @param receipt delegated call receipt from worker
     */
    function synthTransferRequestPayNative(
        bytes32 tokenReal,
        address tokenSynth,
        uint256 amount,
        address to,
        ISynthesis.SynthParams calldata synthParams,
        DelegatedCallReceipt calldata receipt
    ) external payable {
        address worker = _checkWorkerSignature(synthParams.chainId, _SYNTH_TRANSFER_REQUEST_SIGNATURE_HASH, receipt);
        _proceedFees(receipt.executionPrice, worker);
        SafeERC20.safeTransferFrom(IERC20(tokenSynth), msg.sender, address(this), amount);
        IERC20(tokenSynth).approve(_synthesis, amount);
        ISynthesis(_synthesis).synthTransfer(tokenReal, amount, msg.sender, to, synthParams);
    }

    /**
     * @dev Unsynthesize request to another EVM chain via native payment.
     * @param tokenSynth synthetic token address for unsynthesize
     * @param amount amount to unsynth
     * @param to recipient address
     * @param synthParams transfer params
     * @param receipt delegated call receipt from worker
     */
    function unsynthesizeRequestPayNative(
        address tokenSynth,
        uint256 amount,
        address to,
        ISynthesis.SynthParams calldata synthParams,
        DelegatedCallReceipt calldata receipt
    ) external payable {
        address worker = _checkWorkerSignature(synthParams.chainId, _UNSYNTHESIZE_REQUEST_SIGNATURE_HASH, receipt);
        _proceedFees(receipt.executionPrice, worker);
        SafeERC20.safeTransferFrom(IERC20(tokenSynth), msg.sender, address(this), amount);
        IERC20(tokenSynth).approve(_synthesis, amount);
        ISynthesis(_synthesis).burnSyntheticToken(tokenSynth, amount, msg.sender, to, synthParams);
    }

    //.........................DIRECT-METHODS...........................
    //=============================PORTAL===============================
    /**
     * @dev Direct token synthesize request.
     * @param token token address to synthesize
     * @param amount amount to synthesize
     * @param synthParams transfer params
     */
    function tokenSynthesizeRequest(
        address token,
        uint256 amount,
        address to,
        IPortal.SynthParams calldata synthParams
    ) external {
        SafeERC20.safeTransferFrom(IERC20(token), msg.sender, _portal, amount);
        IPortal(_portal).synthesize(token, amount, msg.sender, to, synthParams);
    }

    /**
     * @dev Direct token synthesize request with permit.
     * @param token token address to synthesize
     * @param amount amount to synthesize
     * @param synthParams synthesize parameters
     * @param permitData permit data
     */
    function tokenSynthesizeRequestWithPermit(
        address token,
        uint256 amount,
        address to,
        IPortal.SynthParams calldata synthParams,
        IPortal.PermitData calldata permitData
    ) external {
        IERC20Permit(token).permit(
            msg.sender,
            address(this),
            permitData.approveMax ? uint256(2**256 - 1) : amount,
            permitData.deadline,
            permitData.v,
            permitData.r,
            permitData.s
        );
        SafeERC20.safeTransferFrom(IERC20(token), msg.sender, _portal, amount);
        IPortal(_portal).synthesize(token, amount, msg.sender, to, synthParams);
    }

    /**
     * @dev  Direct token synthesize request with bytes32 support for Solana.
     * @param token token address to synthesize
     * @param amount amount to synthesize
     * @param pubkeys synth data for Solana
     * @param txStateBump transaction state bump
     * @param chainId opposite chain ID
     */
    function tokenSynthesizeRequestToSolana(
        address token,
        uint256 amount,
        bytes32[] calldata pubkeys,
        bytes1 txStateBump,
        uint256 chainId
    ) external {
        SafeERC20.safeTransferFrom(IERC20(token), msg.sender, _portal, amount);
        IPortal(_portal).synthesizeToSolana(token, amount, msg.sender, pubkeys, txStateBump, chainId);
    }

    /**
     * @dev  Direct batch synthesize request with data transition.
     * @param token token addresses to synthesize
     * @param amount amounts to synthesize
     * @param transitData transit data
     * @param synthParams synthesize parameters
     * @param permitData permit operation params
     */
    function batchSynthesizeRequestWithDataTransit(
        address[] calldata token,
        uint256[] calldata amount, // set a positive amount in order to initiate a synthesize request
        address to,
        IPortal.TransitData calldata transitData,
        IPortal.SynthParams calldata synthParams,
        IPortal.PermitData[] calldata permitData
    ) external {
        for (uint256 i = 0; i < token.length; i++) {
            if (amount[i] > 0) {
                if (permitData[i].v != 0) {
                    IERC20Permit(token[i]).permit(
                        msg.sender,
                        address(this),
                        permitData[i].approveMax ? uint256(2**256 - 1) : amount[i],
                        permitData[i].deadline,
                        permitData[i].v,
                        permitData[i].r,
                        permitData[i].s
                    );
                }
                SafeERC20.safeTransferFrom(IERC20(token[i]), msg.sender, _portal, amount[i]);
            }
        }
        IPortal(_portal).synthesizeBatchWithDataTransit(token, amount, msg.sender, to, synthParams, transitData);
    }

    /**
     * @dev Direct revert burnSyntheticToken() operation, can be called several times.
     * @param txID transaction ID to unburn
     * @param receiveSide receiver contract address
     * @param oppositeBridge opposite bridge address
     * @param chainId opposite chain ID
     * @param v must be a valid part of the signature from tx owner
     * @param r must be a valid part of the signature from tx owner
     * @param s must be a valid part of the signature from tx owner
     */
    function emergencyUnburnRequest(
        bytes32 txID,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        IPortal(_portal).emergencyUnburnRequest(txID, receiveSide, oppositeBridge, chainId, v, r, s);
    }

    //==============================CURVE-PROXY==============================
    /**
     * @dev Direct local mint EUSD request (hub chain execution only).
     * @param params MetaMintEUSD params
     * @param permit permit operation params
     * @param token token addresses
     * @param amount amounts to transfer
     */
    function mintEusdRequestVia3pool(
        ICurveProxy.MetaMintEUSD calldata params,
        ICurveProxy.PermitData[] calldata permit,
        address[3] calldata token,
        uint256[3] calldata amount
    ) external {
        for (uint256 i = 0; i < token.length; i++) {
            if (amount[i] > 0) {
                SafeERC20.safeTransferFrom(IERC20(token[i]), msg.sender, _portal, amount[i]);
            }
        }
        ICurveProxy(_curveProxy).addLiquidity3PoolMintEUSD(params, permit, token, amount);
    }

    /**
     * @dev Direct local meta exchange request (hub chain execution only).
     * @param params meta exchange params
     * @param permit permit operation params
     * @param token token addresses to transfer within initial stage
     * @param amount amounts to transfer within initial stage
     */
    function metaExchangeRequestVia3pool(
        ICurveProxy.MetaExchangeParams calldata params,
        ICurveProxy.PermitData[] calldata permit,
        address[3] calldata token,
        uint256[3] calldata amount
    ) external {
        for (uint256 i = 0; i < token.length; i++) {
            if (amount[i] > 0) {
                SafeERC20.safeTransferFrom(IERC20(token[i]), msg.sender, _portal, amount[i]);
            }
        }
        ICurveProxy(_curveProxy).metaExchange(params, permit, token, amount);
    }

    /**
     * @dev Direct local EUSD redeem request with unsynth operation (hub chain execution only).
     * @param params meta redeem EUSD params
     * @param permit permit params
     * @param payToken pay token
     * @param receiveSide recipient address for unsynth operation
     * @param oppositeBridge opposite bridge contract address
     * @param chainId opposite chain ID
     */
    function redeemEusdRequest(
        ICurveProxy.MetaRedeemEUSD calldata params,
        ICurveProxy.PermitData calldata permit,
        address payToken,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId
    ) external {
        SafeERC20.safeTransferFrom(IERC20(payToken), msg.sender, _curveProxy, params.tokenAmountH);
        ICurveProxy(_curveProxy).redeemEUSD(params, permit, receiveSide, oppositeBridge, chainId);
    }

    //==============================SYNTHESIS==============================
    /**
     * @dev Direct synthetic token transfer request to another chain.
     * @param rtoken real token address
     * @param amount amount to transfer
     * @param to recipient address
     * @param synthParams synthesize parameters
     */
    function synthTransferRequest(
        bytes32 rtoken,
        uint256 amount,
        address to,
        ISynthesis.SynthParams calldata synthParams
    ) external {
        address stoken = ISynthesis(_synthesis).getRepresentation(rtoken);
        SafeERC20.safeTransferFrom(IERC20(stoken), msg.sender, address(this), amount);
        IERC20(stoken).approve(_synthesis, amount);
        ISynthesis(_synthesis).synthTransfer(rtoken, amount, msg.sender, to, synthParams);
    }

    /**
     * @dev Direct unsynthesize request.
     * @param stoken synthetic token address for unsynthesize
     * @param amount amount to unsynth
     * @param to recipient address
     * @param synthParams transfer params
     */
    function unsynthesizeRequest(
        address stoken,
        uint256 amount,
        address to,
        ISynthesis.SynthParams calldata synthParams
    ) external {
        SafeERC20.safeTransferFrom(IERC20(stoken), msg.sender, address(this), amount);
        IERC20(stoken).approve(_synthesis, amount);
        ISynthesis(_synthesis).burnSyntheticToken(stoken, amount, msg.sender, to, synthParams);
    }

    /**
     * @dev Direct unsynthesize request to Solana.
     * @param stoken synthetic token address for unsynthesize
     * @param pubkeys synth data for Solana
     * @param amount amount to unsynth
     * @param chainId opposite chain ID
     */
    function unsynthesizeRequestToSolana(
        address stoken,
        bytes32[] calldata pubkeys,
        uint256 amount,
        uint256 chainId
    ) external {
        SafeERC20.safeTransferFrom(IERC20(stoken), msg.sender, address(this), amount);
        IERC20(stoken).approve(_synthesis, amount);
        ISynthesis(_synthesis).burnSyntheticTokenToSolana(stoken, msg.sender, pubkeys, amount, chainId);
    }

    /**
     * @dev Direct emergency unsynthesize request.
     * @param txID synthesize transaction ID
     * @param receiveSide request recipient address
     * @param oppositeBridge opposite bridge address
     * @param chainId opposite chain ID
     * @param v must be a valid part of the signature from tx owner
     * @param r must be a valid part of the signature from tx owner
     * @param s must be a valid part of the signature from tx owner
     */
    function emergencyUnsyntesizeRequest(
        bytes32 txID,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        ISynthesis(_synthesis).emergencyUnsyntesizeRequest(txID, receiveSide, oppositeBridge, chainId, v, r, s);
    }

    function nonces(address owner) public view returns (uint256) {
        return _nonces[owner].current();
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev "Consume a nonce": return the current value and increment.
     */
    function _useNonce(address owner) internal returns (uint256 current) {
        Counters.Counter storage nonce = _nonces[owner];
        current = nonce.current();
        nonce.increment();
    }
}
