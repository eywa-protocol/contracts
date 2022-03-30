// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";
import "./IBridge.sol";
import "./RelayRecipient.sol";
import "./SolanaSerialize.sol";
import "../utils/Typecast.sol";

//TODO: relocate
interface IERC20 {
    function name() external returns (string memory);

    function symbol() external returns (string memory);

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function balanceOf(address user) external returns (uint256);
}

contract Portal is RelayRecipient, SolanaSerialize, Typecast {
    mapping(address => uint256) public balanceOf;
    string public versionRecipient;
    address public bridge;
    address public proxy;

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
        address to;
        address receiveSide;
        address oppositeBridge;
        uint256 chainID;
    }

    struct PermitData {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 deadline;
        bool approveMax;
    }

    mapping(bytes32 => TxState) public requests;
    mapping(bytes32 => UnsynthesizeState) public unsynthesizeStates;
    mapping(bytes32 => uint8) public tokenDecimals;

    event SynthesizeRequest(
        bytes32 indexed _id,
        address indexed _from,
        address indexed _to,
        uint256 _amount,
        address _token
    );
    event SynthesizeRequestSolana(
        bytes32 indexed _id,
        address indexed _from,
        bytes32 indexed _to,
        uint256 _amount,
        address _token
    );
    event RevertBurnRequest(bytes32 indexed _id, address indexed _to);
    event BurnCompleted(bytes32 indexed _id, address indexed _to, uint256 _amount, address _token);
    event RevertSynthesizeCompleted(bytes32 indexed _id, address indexed _to, uint256 _amount, address _token);
    event RepresentationRequest(address indexed _rtoken);
    event ApprovedRepresentationRequest(bytes32 indexed _rtoken);

    function initializeFunc(address _bridge, address _trustedForwarder) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        versionRecipient = "2.2.3";
        bridge = _bridge;
        _setTrustedForwarder(_trustedForwarder);
    }

    modifier onlyBridge() {
        require(bridge == msg.sender, "Portal: bridge only");
        _;
    }

    modifier onlyTrusted() {
        require(bridge == msg.sender || proxy == msg.sender, "Portal: only trusted contract");
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
     * @dev Synthesize token request.
     * @param _token token address to synthesize
     * @param _amount amount to synthesize
     * @param _from msg sender address
     * @param _synthParams synth params
     */
    function synthesize(
        address _token,
        uint256 _amount,
        address _from,
        SynthParams memory _synthParams
    ) external returns (bytes32 txID) {
        // require(tokenDecimals[castToBytes32(_token)] > 0, "Portal: token must be verified"); //TODO
        registerNewBalance(_token, _amount);

        uint256 nonce = IBridge(bridge).getNonce(_from);
        txID = IBridge(bridge).prepareRqId(
            castToBytes32(_synthParams.oppositeBridge),
            _synthParams.chainID,
            castToBytes32(_synthParams.receiveSide),
            castToBytes32(_from),
            nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("mintSyntheticToken(bytes32,address,uint256,address)"))),
            txID,
            _token,
            _amount,
            _synthParams.to
        );

        IBridge(bridge).transmitRequestV2(
            out,
            _synthParams.receiveSide,
            _synthParams.oppositeBridge,
            _synthParams.chainID,
            txID,
            _from,
            nonce
        );
        TxState storage txState = requests[txID];
        txState.from = castToBytes32(_from);
        txState.to = castToBytes32(_synthParams.to);
        txState.rtoken = castToBytes32(_token);
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequest(txID, _from, _synthParams.to, _amount, _token);
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
        bytes32[] memory _pubkeys,
        bytes1 _txStateBump,
        uint256 _chainId
    ) external returns (bytes32 txID) {
        // require(tokenDecimals[castToBytes32(_token)] > 0, "Portal: token must be verified"); //TODO
        registerNewBalance(_token, _amount);

        require(_chainId == SOLANA_CHAIN_ID, "Portal: incorrect chainID");

        // TODO: fix amount digits for solana (digits 18 -> 6)
        require(_amount < type(uint64).max, "Portal: amount too large");
        uint64 solAmount = uint64(_amount);
        // swap bytes
        solAmount = ((solAmount & 0xFF00FF00FF00FF00) >> 8) | ((solAmount & 0x00FF00FF00FF00FF) << 8);
        // swap 2-byte long pairs
        solAmount = ((solAmount & 0xFFFF0000FFFF0000) >> 16) | ((solAmount & 0x0000FFFF0000FFFF) << 16);
        // swap 4-byte long pairs
        solAmount = (solAmount >> 32) | (solAmount << 32);

        uint256 nonce = IBridge(bridge).getNonce(_from);
        txID = IBridge(bridge).prepareRqId(
            _pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            _pubkeys[uint256(SynthesizePubkeys.receiveSide)],
            castToBytes32(_from),
            nonce
        );

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

        IBridge(bridge).transmitRequestV2ToSolana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    _pubkeys[uint256(SynthesizePubkeys.receiveSide)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(sighashMintSyntheticToken, txID, _txStateBump, solAmount)
                )
            ),
            _pubkeys[uint256(SynthesizePubkeys.receiveSide)],
            _pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            txID,
            _from,
            nonce
        );

        TxState storage txState = requests[txID];
        txState.from = castToBytes32(_from);
        txState.to = _pubkeys[uint256(SynthesizePubkeys.to)];
        txState.rtoken = castToBytes32(_token);
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequestSolana(txID, _from, _pubkeys[uint256(SynthesizePubkeys.to)], _amount, _token);
    }

    /**
     * @dev Emergency unsynthesize request. Can be called only by bridge after initiation on a second chain
     * @param _txID transaction ID to unsynth
     */
    function emergencyUnsynthesize(
        bytes32 _txID,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external onlyBridge {
        TxState storage txState = requests[_txID];
        bytes32 emergencyStructHash = keccak256(
            abi.encodePacked(_txID, block.chainid, "emergencyUnsynthesize(bytes32 _txID, uint8 _v, bytes32 _r, bytes32 _s)")
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
     * @dev Unsynthesize request. Can be called only by bridge after initiation on a second chain
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
     * @param _receiveSide receiver contract address
     * @param _oppositeBridge opposite bridge address
     * @param _chainId opposite chain ID
     */
    // TODO check sig from orig sender
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

        bytes memory out = abi.encodeWithSelector(bytes4(keccak256(bytes("emergencyUnburn(bytes32,uint8,bytes32,bytes32)"))), _txID, _v, _r, _s);

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 txID = IBridge(bridge).prepareRqId(
            castToBytes32(_oppositeBridge),
            _chainId,
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
     */
    // TODO check sig from orig sender
    function emergencyUnburnRequestToSolana(
        bytes32 _txID,
        bytes32[] calldata _pubkeys,
        uint256 _chainId
    ) external {
        require(_chainId == SOLANA_CHAIN_ID, "Portal: incorrect chainID");
        require(
            unsynthesizeStates[_txID] != UnsynthesizeState.Unsynthesized,
            "Portal: real tokens already transferred"
        );

        unsynthesizeStates[_txID] = UnsynthesizeState.RevertRequest;

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 txID = IBridge(bridge).prepareRqId(
            _pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            _pubkeys[uint256(SynthesizePubkeys.receiveSide)],
            castToBytes32(_msgSender()),
            nonce
        );

        SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](7);
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
        accounts[5] = SolanaAccountMeta({ pubkey: SOLANA_TOKEN_PROGRAM, isSigner: false, isWritable: false });
        accounts[6] = SolanaAccountMeta({
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
                    abi.encodePacked(sighashEmergencyUnburn)
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
    function changeBridge(address _bridge) external onlyOwner {
        bridge = _bridge;
    }

    function createRepresentationRequest(address _rtoken) external {
        emit RepresentationRequest(_rtoken);
    }

    // implies manual verification point
    function approveRepresentationRequest(
        bytes32 _rtoken,
        uint8 _decimals /**onlyOwner */
    ) external {
        tokenDecimals[_rtoken] = _decimals;
        emit ApprovedRepresentationRequest(_rtoken);
    }

    //TODO
    function setProxyCurve(address _proxy) external onlyOwner {
        proxy = _proxy;
    }

    function setTrustedForwarder(address _forwarder) external onlyOwner {
        return _setTrustedForwarder(_forwarder);
    }

    //TODO: revisit memory location and logic in general (may need to use a single case scenario only)
    function synthesize_batch_transit(
        address[] memory _tokens,
        uint256[] memory _amounts, // set a positive amount in order to initiate a synthesize request
        address _from,
        SynthParams memory _synth_params,
        bytes4 _selector,
        bytes memory _transit_data
    ) external {
        bytes32[] memory txId = new bytes32[](_tokens.length);
        uint256 general_nonce = IBridge(bridge).getNonce(_from);
        bytes32 general_txId = IBridge(bridge).prepareRqId(
            castToBytes32(_synth_params.oppositeBridge),
            _synth_params.chainID,
            castToBytes32(_synth_params.receiveSide),
            castToBytes32(_from),
            general_nonce
        );

        //synthesize request
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_amounts[i] > 0) {
                // require(tokenDecimals[castToBytes32(_token)[i]] > 0, "Portal: token must be verified");

                registerNewBalance(_tokens[i], _amounts[i]);

                txId[i] = keccak256(abi.encodePacked(general_txId, i));
                TxState storage txState = requests[txId[i]];
                txState.from = castToBytes32(_from); //change!
                txState.to = castToBytes32(_synth_params.to);
                txState.rtoken = castToBytes32(_tokens[i]);
                txState.amount = _amounts[i];
                txState.state = RequestState.Sent;

                emit SynthesizeRequest(txId[i], _from, _synth_params.to, _amounts[i], _tokens[i]);

                // break;
            }
        }

        // encode call
        bytes memory out = abi.encodePacked(
            _selector,
            _transit_data,
            //////////////
            _tokens,
            _amounts,
            txId
        );

        IBridge(bridge).transmitRequestV2(
            out,
            _synth_params.receiveSide,
            _synth_params.oppositeBridge,
            _synth_params.chainID,
            general_txId,
            _from,
            general_nonce
        );
    }
}
