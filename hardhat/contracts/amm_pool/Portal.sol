// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";
import "./IBridge.sol";
import "./RelayRecipient.sol";
import "./SolanaSerialize.sol";
import "../utils/Typecast.sol";
import "./RequestIdLib.sol";
import "../interfaces/IERC20.sol";

contract Portal is RelayRecipient, SolanaSerialize, Typecast {
    mapping(address => uint256) public _balanceOf;
    string public _versionRecipient;
    address public _bridge;

    bytes public constant sighashMintSyntheticToken =
        abi.encodePacked(uint8(44), uint8(253), uint8(1), uint8(101), uint8(130), uint8(139), uint8(18), uint8(78));
    bytes public constant sighashEmergencyUnburn =
        abi.encodePacked(uint8(149), uint8(132), uint8(104), uint8(123), uint8(157), uint8(85), uint8(21), uint8(161));

    enum SynthesizePubkeys {
        to,
        receiveSide,
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
        bytes32 from;
        bytes32 to;
        uint256 amount;
        bytes32 rtoken;
        RequestState state;
    }

    struct SynthParams {
        address receiveSide;
        address oppositeBridge;
        uint256 chainId;
    }

    struct PermitData {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 deadline;
        bool approveMax;
    }

    struct TokenInfo {
        uint8 tokenDecimals;
        bool isApproved;
    }

    mapping(bytes32 => TxState) public _requests;
    mapping(bytes32 => UnsynthesizeState) public _unsynthesizeStates;
    mapping(bytes32 => TokenInfo) public _tokenDecimalsData;

    event SynthesizeRequest(
        bytes32 indexed id,
        address indexed from,
        address indexed to,
        uint256 amount,
        address token
    );
    event SynthesizeRequestSolana(
        bytes32 indexed id,
        address indexed from,
        bytes32 indexed to,
        uint256 amount,
        address token
    );
    event RevertBurnRequest(bytes32 indexed id, address indexed to);
    event BurnCompleted(bytes32 indexed id, address indexed to, uint256 amount, address token);
    event RevertSynthesizeCompleted(bytes32 indexed id, address indexed to, uint256 amount, address token);
    event RepresentationRequest(address indexed rtoken);
    event ApprovedRepresentationRequest(bytes32 indexed rtoken);

    function initializeFunc(address bridge, address trustedForwarder) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        _versionRecipient = "2.2.3";
        _bridge = bridge;
        _setTrustedForwarder(trustedForwarder);
    }

    modifier onlyBridge() {
        require(_bridge == msg.sender, "Portal: bridge only");
        _;
    }

    function registerNewBalance(address token, uint256 expectedAmount) internal {
        uint256 oldBalance = _balanceOf[token];
        require(
            (IERC20(token).balanceOf(address(this)) - oldBalance) >= expectedAmount,
            "Portal: insufficient balance"
        );
        _balanceOf[token] += expectedAmount;
    }

    /**
     * @dev Token synthesize request.
     * @param token token address to synthesize
     * @param amount amount to synthesize
     * @param from msg sender address
     * @param synthParams synth params
     */
    function synthesize(
        address token,
        uint256 amount,
        address from,
        address to,
        SynthParams calldata synthParams
    ) external returns (bytes32 txID) {
        require(_tokenDecimalsData[castToBytes32(token)].isApproved, "Portal: token must be verified");
        registerNewBalance(token, amount);

        uint256 _nonce = IBridge(_bridge).getNonce(from);
        txID = RequestIdLib.prepareRqId(
            castToBytes32(synthParams.oppositeBridge),
            synthParams.chainId,
            castToBytes32(synthParams.receiveSide),
            castToBytes32(from),
            _nonce
        );

        bytes memory _out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("mintSyntheticToken(bytes32,address,uint256,address)"))),
            txID,
            token,
            amount,
            to
        );

        IBridge(_bridge).transmitRequestV2(
            _out,
            synthParams.receiveSide,
            synthParams.oppositeBridge,
            synthParams.chainId,
            txID,
            from,
            _nonce
        );
        TxState storage txState = _requests[txID];
        txState.from = castToBytes32(from);
        txState.to = castToBytes32(to);
        txState.rtoken = castToBytes32(token);
        txState.amount = amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequest(txID, from, to, amount, token);
    }

    function solAmount64(uint256 amount) public pure returns (uint64 solAmount) {
        solAmount = uint64(amount);
        // swap bytes
        solAmount = ((solAmount & 0xFF00FF00FF00FF00) >> 8) | ((solAmount & 0x00FF00FF00FF00FF) << 8);
        // swap 2-byte long pairs
        solAmount = ((solAmount & 0xFFFF0000FFFF0000) >> 16) | ((solAmount & 0x0000FFFF0000FFFF) << 16);
        // swap 4-byte long pairs
        solAmount = (solAmount >> 32) | (solAmount << 32);
    }

    function transmitSynthesizeToSolana(
        address token,
        uint64 solAmount,
        bytes32[] calldata pubkeys,
        bytes1 txStateBump,
        SolanaAccountMeta[] memory accounts,
        address sender,
        uint256 nonce,
        bytes32 txID
    ) private {
        // TODO add payment by token
        IBridge(_bridge).transmitRequestV2ToSolana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    pubkeys[uint256(SynthesizePubkeys.receiveSide)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(sighashMintSyntheticToken, txStateBump, uint160(token), solAmount)
                )
            ),
            pubkeys[uint256(SynthesizePubkeys.receiveSide)],
            pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            txID,
            sender,
            nonce
        );
    }

    /**
     * @dev Synthesize token request with bytes32 support for Solana.
     * @param token token address to synthesize
     * @param amount amount to synthesize
     * @param pubkeys synth data for Solana
     * @param txStateBump transaction state bump
     * @param chainId opposite chain ID
     */
    function synthesizeToSolana(
        address token,
        uint256 amount,
        address from,
        bytes32[] calldata pubkeys,
        bytes1 txStateBump,
        uint256 chainId
    ) external returns (bytes32 txID) {
        require(_tokenDecimalsData[castToBytes32(token)].isApproved, "Portal: token must be verified");
        registerNewBalance(token, amount);

        require(chainId == SOLANA_CHAIN_ID, "Portal: incorrect chainID");

        // TODO: fix amount digits for solana (digits 18 -> 6)
        require(amount < type(uint64).max, "Portal: amount too large");
        uint64 _solAmount = solAmount64(amount);

        uint256 _nonce = IBridge(_bridge).getNonce(from);
        txID = RequestIdLib.prepareRqId(
            pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            pubkeys[uint256(SynthesizePubkeys.receiveSide)],
            castToBytes32(from),
            _nonce
        );
        {
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
                pubkey: pubkeys[uint256(SynthesizePubkeys.to)],
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

            transmitSynthesizeToSolana(token, _solAmount, pubkeys, txStateBump, accounts, from, _nonce, txID);
        }
        TxState storage txState = _requests[txID];
        txState.from = castToBytes32(from);
        txState.to = pubkeys[uint256(SynthesizePubkeys.to)];
        txState.rtoken = castToBytes32(token);
        txState.amount = amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequestSolana(txID, from, pubkeys[uint256(SynthesizePubkeys.to)], amount, token);
    }

    /**
     * @dev Emergency unsynthesize request. Can be called only by bridge after initiation on a second chain.
     * @param txID transaction ID to unsynth
     * @param trustedEmergencyExecuter trusted function executer
     */
    function emergencyUnsynthesize(
        bytes32 txID,
        address trustedEmergencyExecuter,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyBridge {
        TxState storage txState = _requests[txID];
        bytes32 emergencyStructHash = keccak256(
            abi.encodePacked(
                txID,
                trustedEmergencyExecuter,
                block.chainid,
                "emergencyUnsynthesize(bytes32,address,uint8,bytes32,bytes32)"
            )
        );
        address txOwner = ECDSA.recover(ECDSA.toEthSignedMessageHash(emergencyStructHash), v, r, s);
        require(txState.state == RequestState.Sent, "Portal: state not open or tx does not exist");
        require(txState.from == castToBytes32(txOwner), "Portal: invalid tx owner");
        txState.state = RequestState.Reverted;
        TransferHelper.safeTransfer(castToAddress(txState.rtoken), castToAddress(txState.from), txState.amount);

        emit RevertSynthesizeCompleted(
            txID,
            castToAddress(txState.from),
            txState.amount,
            castToAddress(txState.rtoken)
        );
    }

    /**
     * @dev Unsynthesize request. Can be called only by bridge after initiation on a second chain.
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
    ) external onlyBridge {
        require(_unsynthesizeStates[txID] == UnsynthesizeState.Default, "Portal: synthetic tokens emergencyUnburn");
        TransferHelper.safeTransfer(token, to, amount);
        _balanceOf[token] -= amount;
        _unsynthesizeStates[txID] = UnsynthesizeState.Unsynthesized;
        emit BurnCompleted(txID, to, amount, token);
    }

    /**
     * @dev Revert burnSyntheticToken() operation, can be called several times.
     * @param txID transaction ID to unburn
     * @param receiveSide receiver chain synthesis contract address
     * @param oppositeBridge opposite bridge address
     * @param chainId opposite chain ID
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
        require(
            _unsynthesizeStates[txID] != UnsynthesizeState.Unsynthesized,
            "Portal: real tokens already transferred"
        );
        _unsynthesizeStates[txID] = UnsynthesizeState.RevertRequest;

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("emergencyUnburn(bytes32,address,uint8,bytes32,bytes32)"))),
            txID,
            _msgSender(),
            v,
            r,
            s
        );

        uint256 _nonce = IBridge(_bridge).getNonce(_msgSender());
        bytes32 txID = RequestIdLib.prepareRqId(
            castToBytes32(oppositeBridge),
            chainId,
            castToBytes32(receiveSide),
            castToBytes32(_msgSender()),
            _nonce
        );
        IBridge(_bridge).transmitRequestV2(out, receiveSide, oppositeBridge, chainId, txID, _msgSender(), _nonce);
        emit RevertBurnRequest(txID, _msgSender());
    }

    /**
     * @dev Revert burnSyntheticToken() operation with bytes32 support for Solana. Can be called several times.
     * @param txID transaction ID to unburn
     * @param pubkeys unsynth data for Solana
     * @param chainId opposite chain ID
     * @param signedMessage solana signed message
     */
    function emergencyUnburnRequestToSolana(
        bytes32 txID,
        bytes32[] calldata pubkeys,
        uint256 chainId,
        SolanaSignedMessage calldata signedMessage
    ) external {
        require(chainId == SOLANA_CHAIN_ID, "Portal: incorrect chainId");
        require(
            _unsynthesizeStates[txID] != UnsynthesizeState.Unsynthesized,
            "Portal: real tokens already transferred"
        );

        _unsynthesizeStates[txID] = UnsynthesizeState.RevertRequest;

        uint256 _nonce = IBridge(_bridge).getNonce(_msgSender());
        bytes32 txID = RequestIdLib.prepareRqId(
            pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            pubkeys[uint256(SynthesizePubkeys.receiveSide)],
            castToBytes32(_msgSender()),
            _nonce
        );

        SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](8);
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
            pubkey: pubkeys[uint256(SynthesizePubkeys.to)],
            isSigner: false,
            isWritable: true
        });
        accounts[5] = SolanaAccountMeta({ pubkey: SOLANA_INSTRUCTIONS, isSigner: false, isWritable: false });
        accounts[6] = SolanaAccountMeta({ pubkey: SOLANA_TOKEN_PROGRAM, isSigner: false, isWritable: false });
        accounts[7] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(SynthesizePubkeys.oppositeBridgeData)],
            isSigner: true,
            isWritable: false
        });

        IBridge(_bridge).transmitRequestV2ToSolana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    pubkeys[uint256(SynthesizePubkeys.receiveSide)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(
                        sighashEmergencyUnburn,
                        signedMessage.r,
                        signedMessage.s,
                        signedMessage.publicKey,
                        signedMessage.message
                    )
                )
            ),
            pubkeys[uint256(SynthesizePubkeys.receiveSide)],
            pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            txID,
            _msgSender(),
            _nonce
        );

        emit RevertBurnRequest(txID, _msgSender());
    }

    // should be restricted in mainnets (test only)
    /**
     * @dev Changes bridge address
     * @param bridge new bridge address
     */
    function changeBridge(address bridge) external onlyOwner {
        _bridge = bridge;
    }

    /**
     * @dev Creates token representation request
     * @param rtoken real token address for representation
     */
    function createRepresentationRequest(address rtoken) external {
        emit RepresentationRequest(rtoken);
    }

    // implies manual verification point
    /**
     * @dev Manual representation request approve
     * @param rtoken real token address
     * @param decimals token decimals
     */
    function approveRepresentationRequest(bytes32 rtoken, uint8 decimals) external onlyOwner {
        _tokenDecimalsData[rtoken].tokenDecimals = decimals;
        _tokenDecimalsData[rtoken].isApproved = true;

        emit ApprovedRepresentationRequest(rtoken);
    }

    /**
     * @dev Set representation request approve state
     * @param rtoken real token address
     * @param decimals token decimals
     * @param approve approval state
     */
    function approveRepresentationRequest(
        bytes32 rtoken,
        uint8 decimals,
        bool approve
    ) external onlyOwner {
        _tokenDecimalsData[rtoken].tokenDecimals = decimals;
        _tokenDecimalsData[rtoken].isApproved = approve;

        emit ApprovedRepresentationRequest(rtoken);
    }

    /**
     * @dev Returns token decimals
     * @param rtoken token address
     */
    function tokenDecimals(bytes32 rtoken) public view returns (uint8) {
        return _tokenDecimalsData[rtoken].tokenDecimals;
    }

    /**
     * @dev Sets new trusted forwarder
     * @param forwarder new forwarder address
     */
    function setTrustedForwarder(address forwarder) external onlyOwner {
        return _setTrustedForwarder(forwarder);
    }
}
