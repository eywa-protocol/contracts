// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";
import "../../amm_pool/IBridge.sol";
import "../../amm_pool/RelayRecipient.sol";
import "../../amm_pool/SolanaSerialize.sol";
import "../../utils/Typecast.sol";
import "../../amm_pool/RequestIdLib.sol";
import "../../interfaces/IERC20.sol";
contract PortalV2 is RelayRecipient, SolanaSerialize, Typecast {
    mapping(address => uint256) public balanceOf;
    string public versionRecipient;
    address public bridge;
    uint256 public thisChainId;

    bytes public constant sighashMintSyntheticToken =
        abi.encodePacked(uint8(44), uint8(253), uint8(1), uint8(101), uint8(130), uint8(139), uint8(18), uint8(78));
    bytes public constant sighashEmergencyUnburn =
        abi.encodePacked(uint8(149), uint8(132), uint8(104), uint8(123), uint8(157), uint8(85), uint8(21), uint8(161));
    uint256 public testValue;

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

    mapping(bytes32 => TxState) public requests;
    mapping(bytes32 => UnsynthesizeState) public unsynthesizeStates;
    mapping(bytes32 => TokenInfo) public tokenDecimalsData;

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

    function initializeFunc(address _bridge, address _trustedForwarder, uint256 _thisChainId) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        versionRecipient = "2.2.3";
        bridge = _bridge;
        _setTrustedForwarder(_trustedForwarder);
        thisChainId = _thisChainId;
    }

    modifier onlyBridge() {
        require(bridge == msg.sender, "Portal: bridge only");
        _;
    }

    function registerNewBalance(address token, uint256 expectedAmount) internal {
        uint256 oldBalance = balanceOf[token];
        require(
            (IERC20(token).balanceOf(address(this)) - oldBalance) >= expectedAmount,
            "Portal: insufficient balance"
        );
        balanceOf[token] += expectedAmount;
    }

    /**
     * @dev Token synthesize request.
     * @param _token token address to synthesize
     * @param _amount amount to synthesize
     * @param _from msg sender address
     * @param _synthParams synth params
     */
    function synthesize(
        address _token,
        uint256 _amount,
        address _from,
        address _to,
        SynthParams calldata _synthParams
    ) external returns (bytes32 txID) {
        require(tokenDecimalsData[castToBytes32(_token)].isApproved, "Portal: token must be verified");
        registerNewBalance(_token, _amount);

        uint256 nonce = IBridge(bridge).getNonce(_from);
        txID = RequestIdLib.prepareRqId(
            castToBytes32(_synthParams.oppositeBridge),
            _synthParams.chainId,
            thisChainId,
            castToBytes32(_synthParams.receiveSide),
            castToBytes32(_from),
            nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("mintSyntheticToken(bytes32,address,uint256,address)"))),
            txID,
            _token,
            _amount,
            _to
        );

        IBridge(bridge).transmitRequestV2(
            out,
            _synthParams.receiveSide,
            _synthParams.oppositeBridge,
            _synthParams.chainId,
            txID,
            _from,
            nonce
        );
        TxState storage txState = requests[txID];
        txState.from = castToBytes32(_from);
        txState.to = castToBytes32(_to);
        txState.rtoken = castToBytes32(_token);
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequest(txID, _from, _to, _amount, _token);
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
        address _token,
        uint64 solAmount,
        bytes32[] calldata _pubkeys,
        bytes1 _txStateBump,
        SolanaAccountMeta[] memory accounts,
        address sender,
        uint256 nonce,
        bytes32 txID
    ) private {
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2ToSolana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    _pubkeys[uint256(SynthesizePubkeys.receiveSide)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(sighashMintSyntheticToken, _txStateBump, uint160(_token), solAmount)
                )
            ),
            _pubkeys[uint256(SynthesizePubkeys.receiveSide)],
            _pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            txID,
            sender,
            nonce
        );
    }

    /**
     * @dev Synthesize token request with bytes32 support for Solana.
     * @param _token token address to synthesize
     * @param _amount amount to synthesize
     * @param _pubkeys synth data for Solana
     * @param _txStateBump transaction state bump
     * @param _chainId opposite chain ID
     */
    function synthesizeToSolana(
        address _token,
        uint256 _amount,
        address _from,
        bytes32[] calldata _pubkeys,
        bytes1 _txStateBump,
        uint256 _chainId
    ) external returns (bytes32 txID) {
        require(tokenDecimalsData[castToBytes32(_token)].isApproved, "Portal: token must be verified");
        registerNewBalance(_token, _amount);

        require(_chainId == SOLANA_CHAIN_ID, "Portal: incorrect chainID");

        // TODO: fix amount digits for solana (digits 18 -> 6)
        require(_amount < type(uint64).max, "Portal: amount too large");
        uint64 solAmount = solAmount64(_amount);

        uint256 nonce = IBridge(bridge).getNonce(_from);
        txID = RequestIdLib.prepareRqId(
            _pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            thisChainId,
            _pubkeys[uint256(SynthesizePubkeys.receiveSide)],
            castToBytes32(_from),
            nonce
        );
        {
            SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](9);
            accounts[0] = SolanaAccountMeta({
                pubkey: _pubkeys[uint256(SynthesizePubkeys.receiveSideData)],
                isSigner: false,
                isWritable: true
            });
            accounts[1] = SolanaAccountMeta({
                pubkey: _pubkeys[uint256(SynthesizePubkeys.syntToken)],
                isSigner: false,
                isWritable: true
            });
            accounts[2] = SolanaAccountMeta({
                pubkey: _pubkeys[uint256(SynthesizePubkeys.syntTokenData)],
                isSigner: false,
                isWritable: false
            });
            accounts[3] = SolanaAccountMeta({
                pubkey: _pubkeys[uint256(SynthesizePubkeys.txState)],
                isSigner: false,
                isWritable: true
            });
            accounts[4] = SolanaAccountMeta({
                pubkey: _pubkeys[uint256(SynthesizePubkeys.to)],
                isSigner: false,
                isWritable: true
            });
            accounts[5] = SolanaAccountMeta({ pubkey: SOLANA_TOKEN_PROGRAM, isSigner: false, isWritable: false });
            accounts[6] = SolanaAccountMeta({ pubkey: SOLANA_SYSTEM_PROGRAM, isSigner: false, isWritable: false });
            accounts[7] = SolanaAccountMeta({ pubkey: SOLANA_RENT, isSigner: false, isWritable: false });
            accounts[8] = SolanaAccountMeta({
                pubkey: _pubkeys[uint256(SynthesizePubkeys.oppositeBridgeData)],
                isSigner: true,
                isWritable: false
            });

            transmitSynthesizeToSolana(_token, solAmount, _pubkeys, _txStateBump, accounts, _from, nonce, txID);
        }
        TxState storage txState = requests[txID];
        txState.from = castToBytes32(_from);
        txState.to = _pubkeys[uint256(SynthesizePubkeys.to)];
        txState.rtoken = castToBytes32(_token);
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequestSolana(txID, _from, _pubkeys[uint256(SynthesizePubkeys.to)], _amount, _token);
    }

    /**
     * @dev Emergency unsynthesize request. Can be called only by bridge after initiation on a second chain.
     * @param _txID transaction ID to unsynth
     * @param _trustedEmergencyExecuter trusted function executer
     */
    function emergencyUnsynthesize(
        bytes32 _txID,
        address _trustedEmergencyExecuter,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external onlyBridge {
        TxState storage txState = requests[_txID];
        bytes32 emergencyStructHash = keccak256(
            abi.encodePacked(
                _txID,
                _trustedEmergencyExecuter,
                block.chainid,
                "emergencyUnsynthesize(bytes32,address,uint8,bytes32,bytes32)"
            )
        );
        address txOwner = ECDSA.recover(ECDSA.toEthSignedMessageHash(emergencyStructHash), _v, _r, _s);
        require(txState.state == RequestState.Sent, "Portal: state not open or tx does not exist");
        require(txState.from == castToBytes32(txOwner), "Portal: invalid tx owner");
        txState.state = RequestState.Reverted;
        TransferHelper.safeTransfer(castToAddress(txState.rtoken), castToAddress(txState.from), txState.amount);

        emit RevertSynthesizeCompleted(
            _txID,
            castToAddress(txState.from),
            txState.amount,
            castToAddress(txState.rtoken)
        );
    }

    /**
     * @dev Unsynthesize request. Can be called only by bridge after initiation on a second chain.
     * @param _txID transaction ID to unsynth
     * @param _token token address to unsynth
     * @param _amount amount to unsynth
     * @param _to recipient address
     */
    function unsynthesize(
        bytes32 _txID,
        address _token,
        uint256 _amount,
        address _to
    ) external onlyBridge {
        require(unsynthesizeStates[_txID] == UnsynthesizeState.Default, "Portal: synthetic tokens emergencyUnburn");
        TransferHelper.safeTransfer(_token, _to, _amount);
        balanceOf[_token] -= _amount;
        unsynthesizeStates[_txID] = UnsynthesizeState.Unsynthesized;
        emit BurnCompleted(_txID, _to, _amount, _token);
    }

    /**
     * @dev Revert burnSyntheticToken() operation, can be called several times.
     * @param _txID transaction ID to unburn
     * @param _receiveSide receiver chain synthesis contract address
     * @param _oppositeBridge opposite bridge address
     * @param _chainId opposite chain ID
     */
    function emergencyUnburnRequest(
        bytes32 _txID,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainId,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        require(
            unsynthesizeStates[_txID] != UnsynthesizeState.Unsynthesized,
            "Portal: real tokens already transferred"
        );
        unsynthesizeStates[_txID] = UnsynthesizeState.RevertRequest;

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("emergencyUnburn(bytes32,address,uint8,bytes32,bytes32)"))),
            _txID,
            _msgSender(),
            _v,
            _r,
            _s
        );

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 txID = RequestIdLib.prepareRqId(
            castToBytes32(_oppositeBridge),
            _chainId,
            thisChainId,
            castToBytes32(_receiveSide),
            castToBytes32(_msgSender()),
            nonce
        );
        IBridge(bridge).transmitRequestV2(out, _receiveSide, _oppositeBridge, _chainId, txID, _msgSender(), nonce);
        emit RevertBurnRequest(txID, _msgSender());
    }

    /**
     * @dev Revert burnSyntheticToken() operation with bytes32 support for Solana. Can be called several times.
     * @param _txID transaction ID to unburn
     * @param _pubkeys unsynth data for Solana
     * @param _chainId opposite chain ID
     * @param _signedMessage solana signed message
     */
    function emergencyUnburnRequestToSolana(
        bytes32 _txID,
        bytes32[] calldata _pubkeys,
        uint256 _chainId,
        SolanaSignedMessage calldata _signedMessage
    ) external {
        require(_chainId == SOLANA_CHAIN_ID, "Portal: incorrect chainId");
        require(
            unsynthesizeStates[_txID] != UnsynthesizeState.Unsynthesized,
            "Portal: real tokens already transferred"
        );

        unsynthesizeStates[_txID] = UnsynthesizeState.RevertRequest;

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 txID = RequestIdLib.prepareRqId(
            _pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            thisChainId,
            _pubkeys[uint256(SynthesizePubkeys.receiveSide)],
            castToBytes32(_msgSender()),
            nonce
        );

        SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](8);
        accounts[0] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(SynthesizePubkeys.receiveSideData)],
            isSigner: false,
            isWritable: false
        });
        accounts[1] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(SynthesizePubkeys.txState)],
            isSigner: false,
            isWritable: true
        });
        accounts[2] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(SynthesizePubkeys.syntToken)],
            isSigner: false,
            isWritable: true
        });
        accounts[3] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(SynthesizePubkeys.syntTokenData)],
            isSigner: false,
            isWritable: false
        });
        accounts[4] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(SynthesizePubkeys.to)],
            isSigner: false,
            isWritable: true
        });
        accounts[5] = SolanaAccountMeta({ pubkey: SOLANA_INSTRUCTIONS, isSigner: false, isWritable: false });
        accounts[6] = SolanaAccountMeta({ pubkey: SOLANA_TOKEN_PROGRAM, isSigner: false, isWritable: false });
        accounts[7] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(SynthesizePubkeys.oppositeBridgeData)],
            isSigner: true,
            isWritable: false
        });

        IBridge(bridge).transmitRequestV2ToSolana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    _pubkeys[uint256(SynthesizePubkeys.receiveSide)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(
                        sighashEmergencyUnburn,
                        _signedMessage.r,
                        _signedMessage.s,
                        _signedMessage.publicKey,
                        _signedMessage.message
                    )
                )
            ),
            _pubkeys[uint256(SynthesizePubkeys.receiveSide)],
            _pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            txID,
            _msgSender(),
            nonce
        );

        emit RevertBurnRequest(txID, _msgSender());
    }

    // should be restricted in mainnets (test only)
    /**
     * @dev Changes bridge address
     * @param _bridge new bridge address
     */
    function changeBridge(address _bridge) external onlyOwner {
        bridge = _bridge;
    }

    /**
     * @dev Creates token representation request
     * @param _rtoken real token address for representation
     */
    function createRepresentationRequest(address _rtoken) external {
        emit RepresentationRequest(_rtoken);
    }

    // implies manual verification point
    /**
     * @dev Manual representation request approve
     * @param _rtoken real token address
     * @param _decimals token decimals
     */
    function approveRepresentationRequest(bytes32 _rtoken, uint8 _decimals) external onlyOwner {
        tokenDecimalsData[_rtoken].tokenDecimals = _decimals;
        tokenDecimalsData[_rtoken].isApproved = true;

        emit ApprovedRepresentationRequest(_rtoken);
    }

    /**
     * @dev Set representation request approve state
     * @param _rtoken real token address
     * @param _decimals token decimals
     * @param _approve approval state
     */
    function approveRepresentationRequest(
        bytes32 _rtoken,
        uint8 _decimals,
        bool _approve
    ) external onlyOwner {
        tokenDecimalsData[_rtoken].tokenDecimals = _decimals;
        tokenDecimalsData[_rtoken].isApproved = _approve;

        emit ApprovedRepresentationRequest(_rtoken);
    }

    /**
     * @dev Returns token decimals
     * @param _rtoken token address
     */
    function tokenDecimals(bytes32 _rtoken) public view returns (uint8) {
        return tokenDecimalsData[_rtoken].tokenDecimals;
    }

    /**
     * @dev Sets new trusted forwarder
     * @param _forwarder new forwarder address
     */
    function setTrustedForwarder(address _forwarder) external onlyOwner {
        return _setTrustedForwarder(_forwarder);
    }

    function testFunc() external {
        testValue++;
    }
}
