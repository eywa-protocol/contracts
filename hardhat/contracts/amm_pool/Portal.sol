// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-newone/utils/math/SafeMath.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "./IBridge.sol";
import "./RelayRecipient.sol";
import "./SolanaSerialize.sol";
import "../utils/Typecast.sol";

//TODO: relocate
interface IERC20 {
    function name() external returns (string memory);

    function symbol() external returns (string memory);
}

contract Portal is RelayRecipient, SolanaSerialize, Typecast {
    using SafeMath for uint256;

    mapping(address => uint256) public balanceOf;
    address public bridge;
    address public proxy;

    bytes public constant sighashMintSyntheticToken =
        abi.encodePacked(uint8(44), uint8(253), uint8(1), uint8(101), uint8(130), uint8(139), uint8(18), uint8(78));
    bytes public constant sighashEmergencyUnburn =
        abi.encodePacked(uint8(149), uint8(132), uint8(104), uint8(123), uint8(157), uint8(85), uint8(21), uint8(161));

    enum SynthesizePubkeys {
        recipientAddress,
        callDestination,
        receiveSideData,
        oppositeBridge,
        oppositeBridgeData,
        syntToken,
        syntTokenData,
        txState
    }

    enum RequestState {
        Default,
        Sent,
        Reverted
    }
    enum UnsynthesizeState {
        Default,
        Unsynthesized,
        RevertRequest
    }

    struct TxState {
        bytes32 sender;
        bytes32 recipientAddress;
        uint256 amount;
        bytes32 rtoken;
        RequestState state;
    }

    struct SynthParams {
        address recipientAddress;
        address callDestination;
        address oppositeBridge;
        uint256 chainID;
    }

    uint256 requestCount = 1;
    mapping(bytes32 => TxState) public requests;
    mapping(bytes32 => UnsynthesizeState) public unsynthesizeStates;
    mapping(address => bytes) public tokenData;

    event SynthesizeRequest(
        bytes32 indexed _id,
        address indexed _from,
        address indexed to,
        uint256 amount,
        address token
    );
    event SynthesizeRequestSolana(
        bytes32 indexed _id,
        address indexed _from,
        bytes32 indexed to,
        uint256 amount,
        address token
    );
    event RevertBurnRequest(bytes32 indexed _id, address indexed to);
    event BurnCompleted(bytes32 indexed _id, address indexed to, uint256 amount, address token);
    event RevertSynthesizeCompleted(bytes32 indexed _id, address indexed to, uint256 amount, address token);
    event RepresentationRequest(address indexed rtoken);
    event ApprovedRepresentationRequest(address indexed rtoken);

    constructor(address _bridge, address _trustedForwarder) RelayRecipient(_trustedForwarder) {
        bridge = _bridge;
    }

    modifier onlyBridge() {
        require(bridge == _msgSender());
        _;
    }

    modifier onlyTrusted() {
        require(bridge == _msgSender() || proxy == _msgSender());
        _;
    }

    /**
     * @dev Synthesize token request.
     * @param token token address to synthesize
     * @param amount amount to synthesize
     * @param recipientAddress outcome recipient address
     * @param callDestination request recipient address
     * @param oppositeBridge opposite bridge address
     * @param chainID opposite chain ID
     */
    function synthesize(
        address token,
        uint256 amount,
        address recipientAddress,
        address callDestination,
        address oppositeBridge,
        uint256 chainID
    ) external returns (bytes32 txID) {
        require(tokenData[token].length != 0, "Portal: token must be verified");
        TransferHelper.safeTransferFrom(token, _msgSender(), address(this), amount);
        balanceOf[token] = balanceOf[token].add(amount);

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            castToBytes32(oppositeBridge),
            chainID,
            castToBytes32(callDestination),
            castToBytes32(_msgSender()),
            nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("mintSyntheticToken(bytes32,address,uint256,address)"))),
            txID,
            token,
            amount,
            recipientAddress
        );
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(out, callDestination, oppositeBridge, chainID, txID, _msgSender(), nonce);
        TxState storage txState = requests[txID];
        txState.sender = castToBytes32(_msgSender());
        txState.recipientAddress = castToBytes32(recipientAddress);
        txState.rtoken = castToBytes32(token);
        txState.amount = amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequest(txID, _msgSender(), recipientAddress, amount, token);
    }

    /**
     * @dev Synthesize token request with bytes32 support for Solana.
     * @param token token address to synthesize
     * @param amount amount to synthesize
     * @param pubkeys synth data for Solana
     * @param txStateBump transaction state bump
     * @param chainId opposite chain ID
     */
    function synthesize_solana(
        address token,
        uint256 amount,
        bytes32[] calldata pubkeys,
        bytes1 txStateBump,
        uint256 chainId
    ) external returns (bytes32 txID) {
        require(tokenData[token].length != 0, "Portal: token must be verified");
        TransferHelper.safeTransferFrom(token, _msgSender(), address(this), amount);
        balanceOf[token] = balanceOf[token].add(amount);

        require(chainId == SOLANA_CHAIN_ID, "incorrect chainID");

        // TODO: fix amount digits for solana (digits 18 -> 6)
        require(amount < type(uint64).max, "amount too large");
        uint64 solAmount = uint64(amount);
        // swap bytes
        solAmount = ((solAmount & 0xFF00FF00FF00FF00) >> 8) | ((solAmount & 0x00FF00FF00FF00FF) << 8);
        // swap 2-byte long pairs
        solAmount = ((solAmount & 0xFFFF0000FFFF0000) >> 16) | ((solAmount & 0x0000FFFF0000FFFF) << 16);
        // swap 4-byte long pairs
        solAmount = (solAmount >> 32) | (solAmount << 32);

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            pubkeys[uint256(SynthesizePubkeys.callDestination)],
            castToBytes32(_msgSender()),
            nonce
        );

        SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](9);
        accounts[0] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(SynthesizePubkeys.receiveSideData)],
            isSigner: false,
            isWritable: true
        });
        accounts[1] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(SynthesizePubkeys.syntToken)],
            isSigner: false,
            isWritable: true
        });
        accounts[2] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(SynthesizePubkeys.syntTokenData)],
            isSigner: false,
            isWritable: false
        });
        accounts[3] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(SynthesizePubkeys.txState)],
            isSigner: false,
            isWritable: true
        });
        accounts[4] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(SynthesizePubkeys.recipientAddress)],
            isSigner: false,
            isWritable: true
        });
        accounts[5] = SolanaAccountMeta({ pubkey: SOLANA_TOKEN_PROGRAM, isSigner: false, isWritable: false });
        accounts[6] = SolanaAccountMeta({ pubkey: SOLANA_SYSTEM_PROGRAM, isSigner: false, isWritable: false });
        accounts[7] = SolanaAccountMeta({ pubkey: SOLANA_RENT, isSigner: false, isWritable: false });
        accounts[8] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(SynthesizePubkeys.oppositeBridgeData)],
            isSigner: true,
            isWritable: false
        });

        // TODO add payment by token
        IBridge(bridge).transmitRequestV2_solana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    pubkeys[uint256(SynthesizePubkeys.callDestination)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(sighashMintSyntheticToken, txID, txStateBump, solAmount)
                )
            ),
            pubkeys[uint256(SynthesizePubkeys.callDestination)],
            pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            txID,
            _msgSender(),
            nonce
        );

        TxState storage txState = requests[txID];
        txState.sender = castToBytes32(_msgSender());
        txState.recipientAddress = pubkeys[uint256(SynthesizePubkeys.recipientAddress)];
        txState.rtoken = castToBytes32(token);
        txState.amount = amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequestSolana(
            txID,
            _msgSender(),
            pubkeys[uint256(SynthesizePubkeys.recipientAddress)],
            amount,
            token
        );
    }

    /**
     * @dev Synthesize token request with permit.
     * @param approvalData permit data
     * @param token token address to synthesize
     * @param amount amount to synthesize
     * @param recipientAddress amount recipient address
     * @param callDestination request recipient address
     * @param oppositeBridge opposite bridge address
     * @param chainID opposite chain ID
     */
    function synthesizeWithPermit(
        bytes calldata approvalData,
        address token,
        uint256 amount,
        address recipientAddress,
        address callDestination,
        address oppositeBridge,
        uint256 chainID
    ) external returns (bytes32 txID) {
        require(tokenData[token].length != 0, "Portal: token must be verified");
        (bool _success1, ) = token.call(approvalData);
        require(_success1, "Approve call failed");

        TransferHelper.safeTransferFrom(token, _msgSender(), address(this), amount);
        balanceOf[token] = balanceOf[token].add(amount);

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            castToBytes32(oppositeBridge),
            chainID,
            castToBytes32(callDestination),
            castToBytes32(_msgSender()),
            nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("mintSyntheticToken(bytes32,address,uint256,address)"))),
            txID,
            token,
            amount,
            recipientAddress
        );
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(out, callDestination, oppositeBridge, chainID, txID, _msgSender(), nonce);
        TxState storage txState = requests[txID];
        txState.sender = castToBytes32(_msgSender());
        txState.recipientAddress = castToBytes32(recipientAddress);
        txState.rtoken = castToBytes32(token);
        txState.amount = amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequest(txID, _msgSender(), recipientAddress, amount, token);
    }

    /**
     * @dev Emergency unsynthesize request. Can be called only by bridge after initiation on a second chain
     * @param txID transaction ID to unsynth
     */
    function emergencyUnsynthesize(bytes32 txID) external onlyBridge {
        TxState storage txState = requests[txID];
        require(txState.state == RequestState.Sent, "Portal:state not open or tx does not exist");

        txState.state = RequestState.Reverted; // close
        TransferHelper.safeTransfer(castToAddress(txState.rtoken), castToAddress(txState.recipient), txState.amount);

        emit RevertSynthesizeCompleted(
            txID,
            castToAddress(txState.recipient),
            txState.amount,
            castToAddress(txState.rtoken)
        );
    }

    /**
     * @dev Unsynthesize request. Can be called only by bridge after initiation on a second chain
     * @param txID transaction ID to unsynth
     * @param token token address to unsynth
     * @param amount amount to unsynth
     * @param to recipient address
     */
    function unsynthesize(
        bytes32 txID,
        address token,
        uint256 amount,
        address to
    ) external onlyTrusted {
        require(unsynthesizeStates[txID] == UnsynthesizeState.Default, "Portal: syntatic tokens emergencyUnburn");

        TransferHelper.safeTransfer(token, to, amount);
        balanceOf[token] = balanceOf[token].sub(amount);

        unsynthesizeStates[txID] = UnsynthesizeState.Unsynthesized;

        emit BurnCompleted(txID, to, amount, token);
    }

    /**
     * @dev Revert burnSyntheticToken() operation, can be called several times.
     * @param txID transaction ID to unburn
     * @param callDestination receiver contract address
     * @param oppositeBridge opposite bridge address
     * @param chainId opposite chain ID
     */
    function emergencyUnburnRequest(
        bytes32 txID,
        address callDestination,
        address oppositeBridge,
        uint256 chainId
    ) external {
        require(unsynthesizeStates[txID] != UnsynthesizeState.Unsynthesized, "Portal: Real tokens already transfered");
        unsynthesizeStates[txID] = UnsynthesizeState.RevertRequest;

        bytes memory out = abi.encodeWithSelector(bytes4(keccak256(bytes("emergencyUnburn(bytes32)"))), txID);
        // TODO add payment by token
        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 _txID = IBridge(bridge).prepareRqId(
            castToBytes32(oppositeBridge),
            chainId,
            castToBytes32(callDestination),
            castToBytes32(_msgSender()),
            nonce
        );
        IBridge(bridge).transmitRequestV2(out, callDestination, oppositeBridge, chainId, _txID, _msgSender(), nonce);

        emit RevertBurnRequest(_txID, _msgSender());
    }

    /**
     * @dev Revert burnSyntheticToken() operation with bytes32 support for Solana. Can be called several times.
     * @param txID transaction ID to unburn
     * @param pubkeys unsynth data for Solana
     * @param chainId opposite chain ID
     */
    function emergencyUnburnRequest_solana(
        bytes32 txID,
        bytes32[] calldata pubkeys,
        uint256 chainId
    ) external {
        require(chainId == SOLANA_CHAIN_ID, "incorrect chainID");
        require(unsynthesizeStates[txID] != UnsynthesizeState.Unsynthesized, "Portal: Real tokens already transfered");

        unsynthesizeStates[txID] = UnsynthesizeState.RevertRequest;

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 _txID = IBridge(bridge).prepareRqId(
            pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            pubkeys[uint256(SynthesizePubkeys.callDestination)],
            castToBytes32(_msgSender()),
            nonce
        );

        SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](7);
        accounts[0] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(SynthesizePubkeys.receiveSideData)],
            isSigner: false,
            isWritable: false
        });
        accounts[1] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(SynthesizePubkeys.txState)],
            isSigner: false,
            isWritable: true
        });
        accounts[2] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(SynthesizePubkeys.syntToken)],
            isSigner: false,
            isWritable: true
        });
        accounts[3] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(SynthesizePubkeys.syntTokenData)],
            isSigner: false,
            isWritable: false
        });
        accounts[4] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(SynthesizePubkeys.recipientAddress)],
            isSigner: false,
            isWritable: true
        });
        accounts[5] = SolanaAccountMeta({ pubkey: SOLANA_TOKEN_PROGRAM, isSigner: false, isWritable: false });
        accounts[6] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(SynthesizePubkeys.oppositeBridgeData)],
            isSigner: true,
            isWritable: false
        });

        // TODO add payment by token
        IBridge(bridge).transmitRequestV2_solana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    pubkeys[uint256(SynthesizePubkeys.callDestination)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(sighashEmergencyUnburn)
                )
            ),
            pubkeys[uint256(SynthesizePubkeys.callDestination)],
            pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            _txID,
            _msgSender(),
            nonce
        );

        emit RevertBurnRequest(_txID, _msgSender());
    }

    // should be restricted in mainnets (test only)
    function changeBridge(address _bridge) external onlyOwner {
        bridge = _bridge;
    }

    function versionRecipient() public pure returns (string memory) {
        return "2.0.1";
    }

    function createRepresentationRequest(address rtoken) external {
        emit RepresentationRequest(rtoken);
    }

    // implies manual verification point
    function approveRepresentationRequest(
        address rtoken 
    ) external onlyOwner {
        tokenData[rtoken] = abi.encode(IERC20(rtoken).name(), IERC20(rtoken).symbol());
        emit ApprovedRepresentationRequest(rtoken);
    }

    //TODO
    function getTxId() external view returns (bytes32) {
        return keccak256(abi.encodePacked(this, block.timestamp));
    }

    function setProxyCurve(address _proxy) external onlyOwner {
        proxy = _proxy;
    }

    function synthesize_transit(
        address token,
        uint256 amount,
        //////////////////////
        address recipientAddress,
        address callDestination,
        address oppositeBridge,
        uint256 chainID,
        bytes memory out
    ) external returns (bytes32 txId) {
        require(tokenData[token].length != 0, "Portal: token must be verified");
        TransferHelper.safeTransferFrom(token, _msgSender(), address(this), amount);
        balanceOf[token] = balanceOf[token].add(amount);

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());

        txId = IBridge(bridge).prepareRqId(
            castToBytes32(oppositeBridge),
            chainID,
            castToBytes32(callDestination),
            castToBytes32(_msgSender()),
            nonce
        );

        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(out, callDestination, oppositeBridge, chainID, txId, _msgSender(), nonce);
        TxState storage txState = requests[txId];
        txState.sender = castToBytes32(_msgSender()); //change!
        txState.recipientAddress = castToBytes32(recipientAddress);
        txState.rtoken = castToBytes32(token);
        txState.amount = amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequest(txId, _msgSender(), recipientAddress, amount, token);
    }

    // portal => proxy
    function synthesize_batch_transit(
        address[] memory tokens,
        uint256[] memory amounts, // set the amount in order to initiate a synthesize request
        SynthParams memory synth_params,
        bytes4 selector,
        bytes memory transit_data
    ) external {
        bytes32[] memory txId = new bytes32[](tokens.length);

        //synthesize request
        for (uint256 i = 0; i < tokens.length; i++) {
            if (amounts[i] > 0) {
                require(tokenData[tokens[i]].length != 0, "Portal: token must be verified");
                TransferHelper.safeTransferFrom(tokens[i], _msgSender(), address(this), amounts[i]);

                balanceOf[tokens[i]] = balanceOf[tokens[i]].add(amounts[i]);
                uint256 nonce = IBridge(bridge).getNonce(_msgSender());

                txId[i] = keccak256(
                    abi.encodePacked(
                        IBridge(bridge).prepareRqId(
                            castToBytes32(synth_params.oppositeBridge),
                            synth_params.chainID,
                            castToBytes32(synth_params.callDestination),
                            castToBytes32(_msgSender()),
                            nonce
                        ),
                        i
                    )
                );

                // TODO add payment by token
                TxState storage txState = requests[txId[i]];
                txState.sender = castToBytes32(_msgSender()); //change!
                txState.recipientAddress = castToBytes32(synth_params.recipientAddress);
                txState.rtoken = castToBytes32(tokens[i]);
                txState.amount = amounts[i];
                txState.state = RequestState.Sent;

                emit SynthesizeRequest(txId[i], _msgSender(), synth_params.recipientAddress, amounts[i], tokens[i]);
            }
        }

        // encode call
        bytes memory out = abi.encodePacked(
            selector,
            transit_data,
            //////////////
            tokens,
            amounts,
            txId
        );

        uint256 general_nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 general_txId = IBridge(bridge).prepareRqId(
            castToBytes32(synth_params.oppositeBridge),
            synth_params.chainID,
            castToBytes32(synth_params.callDestination),
            castToBytes32(_msgSender()),
            general_nonce
        );

        IBridge(bridge).transmitRequestV2(
            out,
            synth_params.callDestination,
            synth_params.oppositeBridge,
            synth_params.chainID,
            general_txId,
            _msgSender(),
            general_nonce
        );
    }
}
