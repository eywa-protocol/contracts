// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-newone/utils/Create2.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";
import "./IBridge.sol";
import "./ISyntERC20.sol";
import "./SyntERC20.sol";
import "./RelayRecipient.sol";
import "./SolanaSerialize.sol";
import "../utils/Typecast.sol";
import "./RequestIdLib.sol";

contract Synthesis is RelayRecipient, SolanaSerialize, Typecast {
    mapping(address => bytes32) public representationReal;
    mapping(bytes32 => address) public representationSynt;
    mapping(bytes32 => uint8) public tokenDecimals;
    bytes32[] private keys;
    mapping(bytes32 => TxState) public requests;
    mapping(bytes32 => SynthesizeState) public synthesizeStates;
    address public bridge;
    address public proxy;
    address public proxyV2;
    string public versionRecipient;
    uint256 public thisChainId;

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

    event BurnRequest(bytes32 indexed id, address indexed from, address indexed to, uint256 amount, address token);
    event BurnRequestSolana(
        bytes32 indexed id,
        address indexed from,
        bytes32 indexed to,
        uint256 amount,
        address token
    );
    event RevertSynthesizeRequest(bytes32 indexed id, address indexed to);
    event SynthesizeCompleted(bytes32 indexed id, address indexed to, uint256 amount, address token);
    event SynthesizeCompletedSolana(bytes32 indexed id, address indexed to, uint256 amount, bytes32 token);
    event SynthTransfer(
        bytes32 indexed id,
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 realToken
    );
    event RevertBurnCompleted(bytes32 indexed id, address indexed to, uint256 amount, address token);
    event CreatedRepresentation(bytes32 indexed rtoken, address indexed stoken);

    function initializeFunc(address _bridge, address _trustedForwarder, uint256 _thisChainId) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();

        versionRecipient = "2.2.3";
        bridge = _bridge;
        _setTrustedForwarder(_trustedForwarder);
        thisChainId = _thisChainId;
    }

    modifier onlyBridge() {
        require(bridge == msg.sender, "Synthesis: bridge only");
        _;
    }

    modifier onlyTrusted() {
        require(bridge == msg.sender || proxy == msg.sender || proxyV2 == msg.sender, "Synthesis: only trusted contract");
        _;
    }

    struct TxState {
        bytes32 from;
        bytes32 to;
        uint256 amount;
        bytes32 token;
        address stoken;
        RequestState state;
    }

    struct SynthParams {
        address receiveSide;
        address oppositeBridge;
        uint256 chainId;
    }

    /**
     * @dev Mints synthetic token. Can be called only by bridge after initiation on a second chain.
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
     * @dev Transfers synthetic token to another chain.
     * @param _tokenSynth synth token address
     * @param _amount amount to transfer
     * @param _to recipient address
     * @param _from msg sender address
     * @param _synthParams synth transfer parameters
     */
    function synthTransfer(
        address _tokenSynth,
        uint256 _amount,
        address _from,
        address _to,
        SynthParams calldata _synthParams
    ) external {
        require(_tokenSynth != address(0), "Synthesis: synth address zero");
        bytes32 tokenReal = representationReal[_tokenSynth];
        require(tokenReal != 0, "Synthesis: real token not found");
        require(
            ISyntERC20(_tokenSynth).getChainId() != _synthParams.chainId,
            "Synthesis: can not synthesize in the intial chain"
        );
        ISyntERC20(_tokenSynth).burn(_msgSender(), _amount);

        uint256 nonce = IBridge(bridge).getNonce(_from);
        bytes32 txID = RequestIdLib.prepareRqId(
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
            tokenReal,
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
        txState.stoken = _tokenSynth;
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit SynthTransfer(txID, _from, _to, _amount, tokenReal);
    }

    /**
     * @dev Revert synthesize() operation, can be called several times.
     * @param _txID transaction ID
     * @param _receiveSide request recipient address
     * @param _oppositeBridge opposite bridge address
     * @param _chainId opposite chain ID
     * @param _v must be a valid part of the signature from tx owner
     * @param _r must be a valid part of the signature from tx owner
     * @param _s must be a valid part of the signature from tx owner
     */
    function emergencyUnsyntesizeRequest(
        bytes32 _txID,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainId,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        require(synthesizeStates[_txID] != SynthesizeState.Synthesized, "Synthesis: synthetic tokens already minted");
        synthesizeStates[_txID] = SynthesizeState.RevertRequest; // close
        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("emergencyUnsynthesize(bytes32,address,uint8,bytes32,bytes32"))),
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

        emit RevertSynthesizeRequest(txID, _msgSender());
    }

    /**
     * @dev Revert synthesize() operation with bytes32 support for Solana. Can be called several times.
     * @param _pubkeys unsynth data for Solana
     * @param _bumpSynthesizeRequest synthesize request bump
     * @param _chainId opposite chain ID
     * @param _signedMessage solana signed message
     */
    function emergencyUnsyntesizeRequestToSolana(
        bytes32[] calldata _pubkeys,
        bytes1 _bumpSynthesizeRequest,
        uint256 _chainId,
        SolanaSignedMessage calldata _signedMessage
    ) external {
        require(_chainId == SOLANA_CHAIN_ID, "Synthesis: incorrect chainId");

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 txID = RequestIdLib.prepareRqId(
            _pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            thisChainId,
            _pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
            castToBytes32(_msgSender()),
            nonce
        );

        require(synthesizeStates[txID] != SynthesizeState.Synthesized, "Synthesis: synthetic tokens already minted");
        synthesizeStates[txID] = SynthesizeState.RevertRequest; // close

        SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](8);
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
        accounts[6] = SolanaAccountMeta({ pubkey: SOLANA_INSTRUCTIONS, isSigner: false, isWritable: false });
        accounts[7] = SolanaAccountMeta({ pubkey: SOLANA_TOKEN_PROGRAM, isSigner: false, isWritable: false });

        IBridge(bridge).transmitRequestV2ToSolana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    _pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(
                        sighashEmergencyUnsynthesize,
                        _bumpSynthesizeRequest,
                        _signedMessage.r,
                        _signedMessage.s,
                        _signedMessage.publicKey,
                        _signedMessage.message
                    )
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
     * @dev Burns given synthetic token and unlocks the original one in the destination chain.
     * @param _stoken transaction ID
     * @param _amount amount to burn
     * @param _to recipient address
     * @param _synthParams transfer parameters
     */
    function burnSyntheticToken(
        address _stoken,
        uint256 _amount,
        address _from,
        address _to,
        SynthParams calldata _synthParams
    ) external returns (bytes32 txID) {
        ISyntERC20(_stoken).burn(_msgSender(), _amount);
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
            bytes4(keccak256(bytes("unsynthesize(bytes32,address,uint256,address)"))),
            txID,
            representationReal[_stoken],
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
        txState.stoken = _stoken;
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit BurnRequest(txID, _from, _to, _amount, _stoken);
    }

    /* *
     * @dev Burns the original representation of given synthetic token with unsynthesize request and bytes32 support for Solana.
     * @param _stoken representation address
     * @param _amount amount to burn
     * @param _to recipient address
     * @param _receiveSide request recipient address
     * @param _oppositeBridge opposite bridge address
     * @param _chainId opposite chain ID
     */
    function burnSyntheticTokenToSolana(
        address _stoken,
        address _from,
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

        uint256 nonce = IBridge(bridge).getNonce(_from);
        txID = RequestIdLib.prepareRqId(
            _pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            thisChainId,
            _pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
            castToBytes32(_from),
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
            _from,
            nonce
        );

        TxState storage txState = requests[txID];
        txState.from = castToBytes32(_from);
        txState.to = _pubkeys[uint256(UnsynthesizePubkeys.destination)];
        txState.stoken = _stoken;
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit BurnRequestSolana(txID, _from, _pubkeys[uint256(UnsynthesizePubkeys.destination)], _amount, _stoken);
    }

    /**
     * @dev Emergency unburn request. Can be called only by bridge after initiation on a second chain
     * @param _txID transaction ID to use unburn on
     */
    function emergencyUnburn(
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
                "emergencyUnburn(bytes32,address,uint8,bytes32,bytes32)"
            )
        );
        address txOwner = ECDSA.recover(ECDSA.toEthSignedMessageHash(emergencyStructHash), _v, _r, _s);
        require(txState.state == RequestState.Sent, "Synthesis: state not open or tx does not exist");
        require(txState.from == castToBytes32(txOwner), "Synthesis: invalid tx owner");
        txState.state = RequestState.Reverted; // close
        ISyntERC20(txState.stoken).mint(castToAddress(txState.from), txState.amount);

        emit RevertBurnCompleted(_txID, castToAddress(txState.from), txState.amount, txState.stoken);
    }

    /**
     * @dev Creates a representation with the given arguments.
     * @param _rtoken real token address
     * @param _name real token name
     * @param _decimals real token decimals number
     * @param _symbol real token symbol
     * @param _chainId real token chain id
     * @param _chainSymbol real token chain symbol
     */
    function createRepresentation(
        bytes32 _rtoken,
        uint8 _decimals,
        string memory _name,
        string memory _symbol,
        uint256 _chainId,
        string memory _chainSymbol
    ) external onlyOwner {
        require(representationSynt[_rtoken] == address(0), "Synthesis: representation already exists");
        require(representationReal[castToAddress(_rtoken)] == 0, "Synthesis: representation already exists");
        address stoken = Create2.deploy(
            0,
            keccak256(abi.encodePacked(_rtoken)),
            abi.encodePacked(
                type(SyntERC20).creationCode,
                abi.encode(
                    string(abi.encodePacked("e", _name)),
                    string(abi.encodePacked("e", _symbol, "(", _chainSymbol, ")")),
                    _decimals,
                    _chainId,
                    _rtoken,
                    _chainSymbol
                )
            )
        );
        setRepresentation(_rtoken, stoken, _decimals);
        emit CreatedRepresentation(_rtoken, stoken);
    }

    /**
     * @dev Creates a custom representation with the given arguments.
     * @param _rtoken real token address
     * @param _name real token name
     * @param _decimals real token decimals number
     * @param _symbol real token symbol
     * @param _chainId real token chain id
     * @param _chainSymbol real token chain symbol
     */
    function createCustomRepresentation(
        bytes32 _rtoken,
        uint8 _decimals,
        string memory _name,
        string memory _symbol,
        uint256 _chainId,
        string memory _chainSymbol
    ) external onlyOwner {
        require(representationSynt[_rtoken] == address(0), "Synthesis: representation already exists");
        require(representationReal[castToAddress(_rtoken)] == 0, "Synthesis: representation already exists");
        address stoken = Create2.deploy(
            0,
            keccak256(abi.encodePacked(_rtoken)),
            abi.encodePacked(
                type(SyntERC20).creationCode,
                abi.encode(_name, _symbol, _decimals, _chainId, _rtoken, _chainSymbol)
            )
        );
        setRepresentation(_rtoken, stoken, _decimals);
        emit CreatedRepresentation(_rtoken, stoken);
    }

    // TODO should be restricted in mainnets (use DAO)
    function changeBridge(address _bridge) external onlyOwner {
        bridge = _bridge;
    }

    function setRepresentation(
        bytes32 _rtoken,
        address _stoken,
        uint8 _decimals
    ) internal {
        representationSynt[_rtoken] = _stoken;
        representationReal[_stoken] = _rtoken;
        tokenDecimals[_rtoken] = _decimals;
        keys.push(_rtoken);
    }

    /**
     * @dev Get token representation address
     * @param _rtoken real token address
     */
    function getRepresentation(bytes32 _rtoken) external view returns (address) {
        return representationSynt[_rtoken];
    }

    /**
     * @dev Get real token address
     * @param _stoken synthetic token address
     */
    function getRealTokenAddress(address _stoken) external view returns (bytes32) {
        return representationReal[_stoken];
    }

    /**
     * @dev Get token representation list
     */
    function getListRepresentation() external view returns (bytes32[] memory, address[] memory) {
        uint256 len = keys.length;
        address[] memory sToken = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            sToken[i] = representationSynt[keys[i]];
        }
        return (keys, sToken);
    }

    /**
     * @dev Set new CurveProxy address
     * @param _proxy new contract address
     */
    function setCurveProxy(address _proxy) external onlyOwner {
        proxy = _proxy;
    }

    /**
     * @dev Set new CurveProxyV2 address
     * @param _proxyV2 new contract address
     */
    function setCurveProxyV2(address _proxyV2) external onlyOwner {
        proxyV2 = _proxyV2;
    }

    /**
     * @dev Sets new trusted forwarder
     * @param _forwarder new forwarder address
     */
    function setTrustedForwarder(address _forwarder) external onlyOwner {
        return _setTrustedForwarder(_forwarder);
    }
}
