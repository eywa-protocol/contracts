// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-newone/utils/Create2.sol";
import "./IBridge.sol";
import "./ISyntERC20.sol";
import "./SyntERC20.sol";
import "./RelayRecipient.sol";
import "./SolanaSerialize.sol";
import "../utils/Typecast.sol";

contract Synthesis is RelayRecipient, SolanaSerialize, Typecast {
    mapping(address => bytes32) public representationReal;
    mapping(bytes32 => address) public representationSynt;
    bytes32[] private keys;
    mapping(bytes32 => TxState) public requests;
    mapping(bytes32 => SynthesizeState) public synthesizeStates;
    address public bridge;
    address public proxy;
    string public override versionRecipient = "2.2.3";

    bytes public constant sighashUnsynthesize =
        abi.encodePacked(uint8(115), uint8(234), uint8(111), uint8(109), uint8(131), uint8(167), uint8(37), uint8(70));
    bytes public constant sighashEmergencyUnsynthesize =
        abi.encodePacked(uint8(102), uint8(107), uint8(151), uint8(50), uint8(141), uint8(172), uint8(244), uint8(63));

    enum UnsynthesizePubkeys {
        receiveSide,
        receiveSideData,
        oppositeBridge,
        oppositeBridgeData,
        txState,
        source,
        destination,
        realToken
    }

    enum RequestState {
        Default,
        Sent,
        Reverted
    }
    enum SynthesizeState {
        Default,
        Synthesized,
        RevertRequest
    }

    event BurnRequest(bytes32 indexed _id, address indexed _from, address indexed _to, uint256 _amount, address _token);
    event BurnRequestSolana(
        bytes32 indexed _id,
        address indexed _from,
        bytes32 indexed _to,
        uint256 _amount,
        address _token
    );
    event RevertSynthesizeRequest(bytes32 indexed _id, address indexed _to);
    event SynthesizeCompleted(bytes32 indexed _id, address indexed _to, uint256 _amount, address _token);
    event SynthesizeCompletedSolana(bytes32 indexed _id, address indexed _to, uint256 _amount, bytes32 _token);
    event RevertBurnCompleted(bytes32 indexed _id, address indexed _to, uint256 _amount, address _token);
    event CreatedRepresentation(bytes32 indexed _rtoken, address indexed _stoken);

    constructor(address _bridge, address _trustedForwarder) {
        bridge = _bridge;
        _setTrustedForwarder(_trustedForwarder);
    }

    modifier onlyBridge() {
        require(bridge == msg.sender, "Synthesis: bridge only");
        _;
    }

    modifier onlyTrusted() {
        require(bridge == msg.sender || proxy == msg.sender, "Synthesis: only trusted contract");
        _;
    }

    struct TxState {
        bytes32 recipient;
        bytes32 chain2address;
        uint256 amount;
        bytes32 token; //TODO
        address stoken;
        RequestState state;
    }

    /**
     * @dev Mints synthetic token. Can be called only by bridge after initiation on a second chain
     * @param _txID transaction ID
     * @param _tokenReal real token address
     * @param _amount amount to mint
     * @param _to recipient address
     */
    function mintSyntheticToken(
        bytes32 _txID,
        address _tokenReal,
        uint256 _amount,
        address _to
    ) external onlyTrusted {
        require(
            synthesizeStates[_txID] == SynthesizeState.Default,
            "Synthesis: emergencyUnsynthesizedRequest called or tokens have been synthesized"
        );

        ISyntERC20(representationSynt[castToBytes32(_tokenReal)]).mint(_to, _amount);
        synthesizeStates[_txID] = SynthesizeState.Synthesized;

        emit SynthesizeCompleted(_txID, _to, _amount, _tokenReal);
    }

    /**
     * @dev Mints synthetic token with bytes32 support for Solana. Can be called only by bridge after initiation on a second chain
     * @param _txID transaction ID
     * @param _tokenReal real token address
     * @param _amount amount to mint
     * @param _to recipient address
     */
    function mintSyntheticTokenToSolana(
        bytes32 _txID,
        bytes32 _tokenReal,
        uint256 _amount,
        address _to
    ) external onlyBridge {
        // TODO add check to Default
        require(
            synthesizeStates[_txID] == SynthesizeState.Default,
            "Synthesis: emergencyUnsynthesizedRequest called or tokens have been synthesized"
        );

        ISyntERC20(representationSynt[_tokenReal]).mint(_to, _amount);
        synthesizeStates[_txID] = SynthesizeState.Synthesized;

        emit SynthesizeCompletedSolana(_txID, _to, _amount, _tokenReal);
    }

    /**
     * @dev Revert synthesize() operation, can be called several times
     * @param _txID transaction ID
     * @param _receiveSide request recipient address
     * @param _oppositeBridge opposite bridge address
     * @param _chainID opposite chain ID
     */
    function emergencyUnsyntesizeRequest(
        bytes32 _txID,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID
    ) external {
        require(synthesizeStates[_txID] != SynthesizeState.Synthesized, "Synthesis: synthetic tokens already minted");
        synthesizeStates[_txID] = SynthesizeState.RevertRequest; // close
        bytes memory out = abi.encodeWithSelector(bytes4(keccak256(bytes("emergencyUnsynthesize(bytes32)"))), _txID);
        // TODO add payment by token
        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 txID = IBridge(bridge).prepareRqId(
            castToBytes32(_oppositeBridge),
            _chainID,
            castToBytes32(_receiveSide),
            castToBytes32(_msgSender()),
            nonce
        );
        IBridge(bridge).transmitRequestV2(out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);

        emit RevertSynthesizeRequest(txID, _msgSender());
    }

    /**
     * @dev Revert synthesize() operation with bytes32 support for Solana. Can be called several times
     * @param _pubkeys unsynth data for Solana
     * @param _bumpSynthesizeRequest synthesize request bump
     * @param _chainId opposite chain ID
     */
    function emergencyUnsyntesizeRequestToSolana(
        bytes32[] calldata _pubkeys,
        bytes1 _bumpSynthesizeRequest,
        uint256 _chainId
    ) external {
        require(_chainId == SOLANA_CHAIN_ID, "Synthesis: incorrect chainId");

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 txID = IBridge(bridge).prepareRqId(
            _pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            _pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
            castToBytes32(_msgSender()),
            nonce
        );

        require(synthesizeStates[txID] != SynthesizeState.Synthesized, "Synthesis: synthetic tokens already minted");
        synthesizeStates[txID] = SynthesizeState.RevertRequest; // close

        SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](7);
        accounts[0] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(UnsynthesizePubkeys.receiveSideData)],
            isSigner: false,
            isWritable: false
        });
        accounts[1] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(UnsynthesizePubkeys.txState)],
            isSigner: false,
            isWritable: true
        });
        accounts[2] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(UnsynthesizePubkeys.realToken)],
            isSigner: false,
            isWritable: false
        });
        accounts[3] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(UnsynthesizePubkeys.source)],
            isSigner: false,
            isWritable: true
        });
        accounts[4] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(UnsynthesizePubkeys.destination)],
            isSigner: false,
            isWritable: true
        });
        accounts[5] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(UnsynthesizePubkeys.oppositeBridgeData)],
            isSigner: true,
            isWritable: false
        });
        accounts[6] = SolanaAccountMeta({ pubkey: SOLANA_TOKEN_PROGRAM, isSigner: false, isWritable: false });

        // TODO add payment by token
        IBridge(bridge).transmitRequestV2ToSolana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    _pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(sighashEmergencyUnsynthesize, _bumpSynthesizeRequest)
                )
            ),
            _pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
            _pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            txID,
            _msgSender(),
            nonce
        );

        emit RevertSynthesizeRequest(txID, _msgSender());
    }

    /**
     * @dev Burns the original representation of given synthetic token in the destination chain
     * @param _stoken transaction ID
     * @param _amount amount to burn
     * @param _chain2address recipient address
     * @param _receiveSide request recipient address
     * @param _oppositeBridge opposite bridge address
     * @param _chainID opposite chain ID
     */
    function burnSyntheticToken(
        address _stoken,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID
    ) external returns (bytes32 txID) {
        ISyntERC20(_stoken).burn(_msgSender(), _amount);
        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            castToBytes32(_oppositeBridge),
            _chainID,
            castToBytes32(_receiveSide),
            castToBytes32(_msgSender()),
            nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("unsynthesize(bytes32,address,uint256,address)"))),
            txID,
            representationReal[_stoken],
            _amount,
            _chain2address
        );
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);
        TxState storage txState = requests[txID];
        txState.recipient = castToBytes32(_msgSender());
        txState.chain2address = castToBytes32(_chain2address);
        txState.stoken = _stoken;
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit BurnRequest(txID, _msgSender(), _chain2address, _amount, _stoken);
    }

    /* *
     * @dev Burns the original representation of given synthetic token with unsynthesize request and bytes32 support for Solana.
     * @param _stoken representation address
     * @param _amount amount to burn
     * @param _chain2address recipient address
     * @param _receiveSide request recipient address
     * @param _oppositeBridge opposite bridge address
     * @param _chainId opposite chain ID
     */
    function burnSyntheticTokenToSolana(
        address _stoken,
        bytes32[] calldata _pubkeys,
        uint256 _amount,
        uint256 _chainId
    ) external returns (bytes32 txID) {
        require(_chainId == SOLANA_CHAIN_ID, "Synthesis: incorrect chainId");

        // TODO: fix amount digits for solana (digits 18 -> 6)
        require(_amount < type(uint64).max, "Synthesis: amount too large");
        uint64 solAmount = uint64(_amount);
        // swap bytes
        solAmount = ((solAmount & 0xFF00FF00FF00FF00) >> 8) | ((solAmount & 0x00FF00FF00FF00FF) << 8);
        // swap 2-byte long pairs
        solAmount = ((solAmount & 0xFFFF0000FFFF0000) >> 16) | ((solAmount & 0x0000FFFF0000FFFF) << 16);
        // swap 4-byte long pairs
        solAmount = (solAmount >> 32) | (solAmount << 32);

        ISyntERC20(_stoken).burn(_msgSender(), _amount);

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            _pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            _pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
            castToBytes32(_msgSender()),
            nonce
        );

        SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](9);
        accounts[0] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(UnsynthesizePubkeys.receiveSideData)],
            isSigner: false,
            isWritable: false
        });
        accounts[1] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(UnsynthesizePubkeys.realToken)],
            isSigner: false,
            isWritable: false
        });
        accounts[2] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(UnsynthesizePubkeys.txState)],
            isSigner: false,
            isWritable: true
        });
        accounts[3] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(UnsynthesizePubkeys.source)],
            isSigner: false,
            isWritable: true
        });
        accounts[4] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(UnsynthesizePubkeys.destination)],
            isSigner: false,
            isWritable: true
        });
        accounts[5] = SolanaAccountMeta({
            pubkey: _pubkeys[uint256(UnsynthesizePubkeys.oppositeBridgeData)],
            isSigner: true,
            isWritable: false
        });
        accounts[6] = SolanaAccountMeta({ pubkey: SOLANA_TOKEN_PROGRAM, isSigner: false, isWritable: false });
        accounts[7] = SolanaAccountMeta({ pubkey: SOLANA_RENT, isSigner: false, isWritable: false });
        accounts[8] = SolanaAccountMeta({ pubkey: SOLANA_SYSTEM_PROGRAM, isSigner: false, isWritable: false });

        // TODO add payment by token
        IBridge(bridge).transmitRequestV2ToSolana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    _pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(sighashUnsynthesize, solAmount)
                )
            ),
            _pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
            _pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            txID,
            _msgSender(),
            nonce
        );

        TxState storage txState = requests[txID];
        txState.recipient = castToBytes32(_msgSender());
        txState.chain2address = _pubkeys[uint256(UnsynthesizePubkeys.destination)];
        txState.stoken = _stoken;
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit BurnRequestSolana(
            txID,
            _msgSender(),
            _pubkeys[uint256(UnsynthesizePubkeys.destination)],
            _amount,
            _stoken
        );
    }

    /**
     * @dev Emergency unburn request. Can be called only by bridge after initiation on a second chain
     * @param _txID transaction ID to use unburn on
     */
    function emergencyUnburn(bytes32 _txID) external onlyBridge {
        TxState storage txState = requests[_txID];
        require(txState.state == RequestState.Sent, "Synthesis: state not open or tx does not exist");
        txState.state = RequestState.Reverted; // close
        ISyntERC20(txState.stoken).mint(castToAddress(txState.recipient), txState.amount);

        emit RevertBurnCompleted(_txID, castToAddress(txState.recipient), txState.amount, txState.stoken);
    }

    /**
     * @dev Creates a representation with the given arguments.
     * @param _rtoken real token address
     * @param _name real token name
     * @param _symbol real token symbol
     */
    function createRepresentation(
        bytes32 _rtoken,
        string calldata _name,
        string calldata _symbol
    ) external onlyOwner {
        require(representationSynt[_rtoken] == address(0), "Synthesis: representation already exists");
        require(representationReal[castToAddress(_rtoken)] == 0, "Synthesis: representation already exists");
        address stoken = Create2.deploy(
            0,
            keccak256(abi.encodePacked(_rtoken)),
            abi.encodePacked(
                type(SyntERC20).creationCode,
                abi.encode(string(abi.encodePacked("e", _name)), string(abi.encodePacked("e", _symbol)))
            )
        );
        setRepresentation(_rtoken, stoken);
        emit CreatedRepresentation(_rtoken, stoken);
    }

    // should be restricted in mainnets
    function changeBridge(address _bridge) external onlyOwner {
        bridge = _bridge;
    }

    // utils
    function setRepresentation(bytes32 _rtoken, address _stoken) internal {
        representationSynt[_rtoken] = _stoken;
        representationReal[_stoken] = _rtoken;
        keys.push(_rtoken);
    }

    function getRepresentation(bytes32 _rtoken) external view returns (address) {
        return representationSynt[_rtoken];
    }

    function getListRepresentation() external view returns (bytes32[] memory, address[] memory) {
        uint256 len = keys.length;
        address[] memory sToken = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            sToken[i] = representationSynt[keys[i]];
        }
        return (keys, sToken);
    }

    function setProxyCurve(address _proxy) external onlyOwner {
        proxy = _proxy;
    }

    //TODO
    function getTxId() external view returns (bytes32) {
        return keccak256(abi.encodePacked(this, block.timestamp));
    }

    function burnSyntheticToken_transit(
        address _stoken,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID,
        bytes calldata _out
    ) external returns (bytes32 txID) {
        ISyntERC20(_stoken).burn(_msgSender(), _amount);
        uint256 nonce = IBridge(bridge).getNonce(_msgSender());

        txID = IBridge(bridge).prepareRqId(
            castToBytes32(_oppositeBridge),
            _chainID,
            castToBytes32(_receiveSide),
            castToBytes32(_msgSender()),
            nonce
        );

        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(_out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);
        TxState storage txState = requests[txID];
        txState.state = RequestState.Sent;

        emit BurnRequest(txID, _msgSender(), _chain2address, _amount, _stoken);
    }

    function setTrustedForwarder(address _forwarder) external onlyOwner {
        return _setTrustedForwarder(_forwarder);
    }
}
