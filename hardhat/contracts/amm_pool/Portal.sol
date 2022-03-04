// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "./IBridge.sol";
import "./RelayRecipient.sol";
import "./SolanaSerialize.sol";
import "../utils/Typecast.sol";

interface Treasury {
     function depositWithPermit(
        bytes calldata _approvalData,
        address _token,
        uint256 _amount
    ) external;

    function deposit(
        address _token,
        uint256 _amount
    ) external;
}

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

    function approve(
        address spender,
        uint256 amount
    ) external returns (bool);
}

contract Portal is RelayRecipient, SolanaSerialize, Typecast {
    mapping(address => uint256) public balanceOf;
    string public versionRecipient;
    address public bridge;
    address public treasury;
    address public proxy;
    uint256 public basePercent;

    bytes public constant sighashMintSyntheticToken =
        abi.encodePacked(uint8(44), uint8(253), uint8(1), uint8(101), uint8(130), uint8(139), uint8(18), uint8(78));
    bytes public constant sighashEmergencyUnburn =
        abi.encodePacked(uint8(149), uint8(132), uint8(104), uint8(123), uint8(157), uint8(85), uint8(21), uint8(161));

    enum SynthesizePubkeys {
        chain2address,
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
        bytes32 recipient;
        bytes32 chain2address;
        uint256 amount;
        bytes32 rtoken;
        RequestState state;
    }

    struct SynthParams {
        address chain2address;
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
    mapping(address => bytes) public tokenData;

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
    event ApprovedRepresentationRequest(address indexed _rtoken);

    function initializeFunc(address _bridge, address _trustedForwarder,address _treasury) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        versionRecipient = "2.2.3";
        basePercent = 1000;
        bridge = _bridge;
        treasury = _treasury;
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

    /**
     * @dev Synthesize token request.
     * @param _token token address to synthesize
     * @param _amount amount to synthesize
     * @param _chain2address amount recipient address
     * @param _receiveSide request recipient address
     * @param _oppositeBridge opposite bridge address
     * @param _chainID opposite chain ID
     */
    function synthesize(
        address _token,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID
    ) external returns (bytes32 txID) {
        uint256 fee = calcFee(_amount);
        uint256 amountToTransfer = _amount - fee;
        TransferHelper.safeTransferFrom(_token, msg.sender, address(this), _amount);
        IERC20(_token).approve(treasury,f ee);
        Treasury(treasury).deposit(_token, fee);
        balanceOf[_token] += amountToTransfer;

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            castToBytes32(_oppositeBridge),
            _chainID,
            castToBytes32(_receiveSide),
            castToBytes32(_msgSender()),
            nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("mintSyntheticToken(bytes32,address,uint256,address)"))),
            txID,
            _token,
            _amount,
            _chain2address
        );
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);
        TxState storage txState = requests[txID];
        txState.recipient = castToBytes32(_msgSender());
        txState.chain2address = castToBytes32(_chain2address);
        txState.rtoken = castToBytes32(_token);
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequest(txID, _msgSender(), _chain2address, _amount, _token);
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
        bytes32[] calldata _pubkeys,
        bytes1 _txStateBump,
        uint256 _chainId
    ) external returns (bytes32 txID) {
        TransferHelper.safeTransferFrom(_token, _msgSender(), address(this), _amount);
        balanceOf[_token] += _amount;

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

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            _pubkeys[uint256(SynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            _pubkeys[uint256(SynthesizePubkeys.receiveSide)],
            castToBytes32(_msgSender()),
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
            pubkey: _pubkeys[uint256(SynthesizePubkeys.chain2address)],
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

        // TODO add payment by token
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
            _msgSender(),
            nonce
        );

        TxState storage txState = requests[txID];
        txState.recipient = castToBytes32(_msgSender());
        txState.chain2address = _pubkeys[uint256(SynthesizePubkeys.chain2address)];
        txState.rtoken = castToBytes32(_token);
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequestSolana(
            txID,
            _msgSender(),
            _pubkeys[uint256(SynthesizePubkeys.chain2address)],
            _amount,
            _token
        );
    }

    /**
     * @dev Synthesize token request with permit.
     * @param _approvalData permit data
     * @param _token token address to synthesize
     * @param _amount amount to synthesize
     * @param _chain2address amount recipient address
     * @param _receiveSide request recipient address
     * @param _oppositeBridge opposite bridge address
     * @param _chainID opposite chain ID
     */
    function synthesizeWithPermit(
        bytes calldata _approvalData,
        address _token,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID
    ) external returns (bytes32 txID) {
        (bool _success1, ) = _token.call(_approvalData);
        require(_success1, "Portal: approve call failed");

        TransferHelper.safeTransferFrom(_token, _msgSender(), address(this), _amount);
        balanceOf[_token] += _amount;

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            castToBytes32(_oppositeBridge),
            _chainID,
            castToBytes32(_receiveSide),
            castToBytes32(_msgSender()),
            nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("mintSyntheticToken(bytes32,address,uint256,address)"))),
            txID,
            _token,
            _amount,
            _chain2address
        );
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);
        TxState storage txState = requests[txID];
        txState.recipient = castToBytes32(_msgSender());
        txState.chain2address = castToBytes32(_chain2address);
        txState.rtoken = castToBytes32(_token);
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequest(txID, _msgSender(), _chain2address, _amount, _token);
    }

    /**
     * @dev Emergency unsynthesize request. Can be called only by bridge after initiation on a second chain
     * @param _txID transaction ID to unsynth
     */
    function emergencyUnsynthesize(bytes32 _txID) external onlyBridge {
        TxState storage txState = requests[_txID];
        require(txState.state == RequestState.Sent, "Portal: state not open or tx does not exist");

        txState.state = RequestState.Reverted;
        TransferHelper.safeTransfer(castToAddress(txState.rtoken), castToAddress(txState.recipient), txState.amount);

        emit RevertSynthesizeCompleted(
            _txID,
            castToAddress(txState.recipient),
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
        uint256 fee = calcFee(_amount);
        uint256 amountToTransfer = _amount - fee;
        IERC20(_token).approve(treasury, fee);
        Treasury(treasury).deposit(_token, fee);
        TransferHelper.safeTransfer(_token, _to, amountToTransfer);
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
    function emergencyUnburnRequest(
        bytes32 _txID,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainId
    ) external {
        require(unsynthesizeStates[_txID] != UnsynthesizeState.Unsynthesized, "Portal: real tokens already transfered");
        unsynthesizeStates[_txID] = UnsynthesizeState.RevertRequest;

        bytes memory out = abi.encodeWithSelector(bytes4(keccak256(bytes("emergencyUnburn(bytes32)"))), _txID);
        // TODO add payment by token
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
    function emergencyUnburnRequestToSolana(
        bytes32 _txID,
        bytes32[] calldata _pubkeys,
        uint256 _chainId
    ) external {
        require(_chainId == SOLANA_CHAIN_ID, "Portal: incorrect chainID");
        require(unsynthesizeStates[_txID] != UnsynthesizeState.Unsynthesized, "Portal: real tokens already transfered");

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
            pubkey: _pubkeys[uint256(SynthesizePubkeys.chain2address)],
            isSigner: false,
            isWritable: true
        });
        accounts[5] = SolanaAccountMeta({ pubkey: SOLANA_TOKEN_PROGRAM, isSigner: false, isWritable: false });
        accounts[6] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(SynthesizePubkeys.oppositeBridgeData)],
            isSigner: true,
            isWritable: false
        });

        // TODO add payment by token
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
        address _rtoken /**onlyOwner */
    ) external {
        tokenData[_rtoken] = abi.encode(IERC20(_rtoken).name(), IERC20(_rtoken).symbol());
        emit ApprovedRepresentationRequest(_rtoken);
    }

    //TODO
    function getTxId() external view returns (bytes32) {
        return keccak256(abi.encodePacked(this, block.timestamp));
    }

    function setProxyCurve(address _proxy) external onlyOwner {
        proxy = _proxy;
    }

    function setTrustedForwarder(address _forwarder) external onlyOwner {
        return _setTrustedForwarder(_forwarder);
    }

    //TODO: redo for single coin case
    function synthesize_transit(
        address _token,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID,
        bytes calldata _out
    ) external returns (bytes32 txId) {
        // require(
        //     tokenData[_token].length != 0,
        //     "Portal: token must be verified"
        // );
        TransferHelper.safeTransferFrom(_token, _msgSender(), address(this), _amount);
        balanceOf[_token] += _amount;

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());

        txId = IBridge(bridge).prepareRqId(
            castToBytes32(_oppositeBridge),
            _chainID,
            castToBytes32(_receiveSide),
            castToBytes32(_msgSender()),
            nonce
        );

        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(_out, _receiveSide, _oppositeBridge, _chainID, txId, _msgSender(), nonce);
        TxState storage txState = requests[txId];
        txState.recipient = castToBytes32(_msgSender()); //change!
        txState.chain2address = castToBytes32(_chain2address);
        txState.rtoken = castToBytes32(_token);
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequest(txId, _msgSender(), _chain2address, _amount, _token);
    }

    //TODO: revisit memory location and logic in general (may need to use a single case scenario only)
    function synthesize_batch_transit(
        address[] memory _tokens,
        uint256[] memory _amounts, // set a positive amount in order to initiate a synthesize request
        SynthParams memory _synth_params,
        bytes4 _selector,
        bytes calldata _transit_data,
        PermitData[] memory _permit_data
    ) external {
        bytes32[] memory txId = new bytes32[](_tokens.length);

        //synthesize request
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_amounts[i] > 0) {
                if (_permit_data[i].v != 0) {
                    uint256 approve_value = _permit_data[i].approveMax ? uint256(2**256 - 1) : _amounts[i];
                    IERC20(_tokens[i]).permit(
                        _msgSender(),
                        address(this),
                        approve_value,
                        _permit_data[i].deadline,
                        _permit_data[i].v,
                        _permit_data[i].r,
                        _permit_data[i].s
                    );
                }
                TransferHelper.safeTransferFrom(_tokens[i], _msgSender(), address(this), _amounts[i]);

                balanceOf[_tokens[i]] += _amounts[i];
                uint256 nonce = IBridge(bridge).getNonce(_msgSender());

                txId[i] = keccak256(
                    abi.encodePacked(
                        IBridge(bridge).prepareRqId(
                            castToBytes32(_synth_params.oppositeBridge),
                            _synth_params.chainID,
                            castToBytes32(_synth_params.receiveSide),
                            castToBytes32(_msgSender()),
                            nonce
                        ),
                        i
                    )
                );

                // TODO add payment by token
                TxState storage txState = requests[txId[i]];
                txState.recipient = castToBytes32(_msgSender()); //change!
                txState.chain2address = castToBytes32(_synth_params.chain2address);
                txState.rtoken = castToBytes32(_tokens[i]);
                txState.amount = _amounts[i];
                txState.state = RequestState.Sent;

                emit SynthesizeRequest(txId[i], _msgSender(), _synth_params.chain2address, _amounts[i], _tokens[i]);
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

        uint256 general_nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 general_txId = IBridge(bridge).prepareRqId(
            castToBytes32(_synth_params.oppositeBridge),
            _synth_params.chainID,
            castToBytes32(_synth_params.receiveSide),
            castToBytes32(_msgSender()),
            general_nonce
        );

        IBridge(bridge).transmitRequestV2(
            out,
            _synth_params.receiveSide,
            _synth_params.oppositeBridge,
            _synth_params.chainID,
            general_txId,
            _msgSender(),
            general_nonce
        );
    }

    function calcFee(uint256 amount)
        public
        view
        returns (uint256 txFee)
    {
        require(amount >= 10, "Transfer amount is too small");
        txFee = (amount * basePercent) / 10000;
        return (txFee);
    }
}
