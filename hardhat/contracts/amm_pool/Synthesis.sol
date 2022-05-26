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
    mapping(address => bytes32) public _representationReal;
    mapping(bytes32 => address) public _representationSynt;
    mapping(bytes32 => uint8) public _tokenDecimals;
    bytes32[] private keys;
    mapping(bytes32 => TxState) public _requests;
    mapping(bytes32 => SynthesizeState) public _synthesizeStates;
    address public _bridge;
    address public _proxy;
    string public _versionRecipient;

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

    function initializeFunc(address bridge, address trustedForwarder) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();

        _versionRecipient = "2.2.3";
        _bridge = bridge;
        _setTrustedForwarder(trustedForwarder);
    }

    modifier onlyBridge() {
        require(_bridge == msg.sender, "Synthesis: _bridge only");
        _;
    }

    modifier onlyTrusted() {
        require(_bridge == msg.sender || _proxy == msg.sender, "Synthesis: only trusted contract");
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
     * @dev Mints synthetic token. Can be called only by _bridge after initiation on a second chain.
     * @param txID transaction ID
     * @param tokenReal real token address
     * @param amount amount to mint
     * @param to recipient address
     */
    function mintSyntheticToken(
        bytes32 txID,
        address tokenReal,
        uint256 amount,
        address to
    ) external onlyTrusted {
        require(
            _synthesizeStates[txID] == SynthesizeState.Default,
            "Synthesis: emergencyUnsynthesizedRequest called or tokens have been synthesized"
        );

        ISyntERC20(_representationSynt[castToBytes32(tokenReal)]).mint(to, amount);
        _synthesizeStates[txID] = SynthesizeState.Synthesized;

        emit SynthesizeCompleted(txID, to, amount, tokenReal);
    }

    /**
     * @dev Transfers synthetic token to another chain.
     * @param tokenSynth synth token address
     * @param amount amount to transfer
     * @param to recipient address
     * @param from msg sender address
     * @param synthParams synth transfer parameters
     */
    function synthTransfer(
        address tokenSynth,
        uint256 amount,
        address from,
        address to,
        SynthParams calldata synthParams
    ) external {
        require(tokenSynth != address(0), "Synthesis: synth address zero");
        bytes32 _tokenReal = _representationReal[tokenSynth];
        require(_tokenReal != 0, "Synthesis: real token not found");
        require(
            ISyntERC20(tokenSynth).getChainId() != synthParams.chainId,
            "Synthesis: can not synthesize in the intial chain"
        );
        ISyntERC20(tokenSynth).burn(_msgSender(), amount);

        uint256 _nonce = IBridge(_bridge).getNonce(from);
        bytes32 _txID = RequestIdLib.prepareRqId(
            castToBytes32(synthParams.oppositeBridge),
            synthParams.chainId,
            castToBytes32(synthParams.receiveSide),
            castToBytes32(from),
            _nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("mintSyntheticToken(bytes32,address,uint256,address)"))),
            _txID,
            _tokenReal,
            amount,
            to
        );

        IBridge(_bridge).transmitRequestV2(
            out,
            synthParams.receiveSide,
            synthParams.oppositeBridge,
            synthParams.chainId,
            _txID,
            from,
            _nonce
        );
        TxState storage txState = _requests[_txID];
        txState.from = castToBytes32(from);
        txState.to = castToBytes32(to);
        txState.stoken = tokenSynth;
        txState.amount = amount;
        txState.state = RequestState.Sent;

        emit SynthTransfer(_txID, from, to, amount, _tokenReal);
    }

    /**
     * @dev Revert synthesize() operation, can be called several times.
     * @param txID transaction ID
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
        require(_synthesizeStates[txID] != SynthesizeState.Synthesized, "Synthesis: synthetic tokens already minted");
        _synthesizeStates[txID] = SynthesizeState.RevertRequest; // close
        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("emergencyUnsynthesize(bytes32,address,uint8,bytes32,bytes32"))),
            txID,
            _msgSender(),
            v,
            r,
            s
        );

        uint256 _nonce = IBridge(_bridge).getNonce(_msgSender());
        bytes32 _txID = RequestIdLib.prepareRqId(
            castToBytes32(oppositeBridge),
            chainId,
            castToBytes32(receiveSide),
            castToBytes32(_msgSender()),
            _nonce
        );
        IBridge(_bridge).transmitRequestV2(out, receiveSide, oppositeBridge, chainId, _txID, _msgSender(), _nonce);

        emit RevertSynthesizeRequest(_txID, _msgSender());
    }

    /**
     * @dev Revert synthesize() operation with bytes32 support for Solana. Can be called several times.
     * @param pubkeys unsynth data for Solana
     * @param bumpSynthesizeRequest synthesize request bump
     * @param chainId opposite chain ID
     * @param signedMessage solana signed message
     */
    function emergencyUnsyntesizeRequestToSolana(
        bytes32[] calldata pubkeys,
        bytes1 bumpSynthesizeRequest,
        uint256 chainId,
        SolanaSignedMessage calldata signedMessage
    ) external {
        require(chainId == SOLANA_CHAIN_ID, "Synthesis: incorrect chainId");

        uint256 _nonce = IBridge(_bridge).getNonce(_msgSender());
        bytes32 _txID = RequestIdLib.prepareRqId(
            pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
            castToBytes32(_msgSender()),
            _nonce
        );

        require(_synthesizeStates[_txID] != SynthesizeState.Synthesized, "Synthesis: synthetic tokens already minted");
        _synthesizeStates[_txID] = SynthesizeState.RevertRequest; // close

        SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](8);
        accounts[0] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(UnsynthesizePubkeys.receiveSideData)],
            isSigner: false,
            isWritable: false
        });
        accounts[1] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(UnsynthesizePubkeys.txState)],
            isSigner: false,
            isWritable: true
        });
        accounts[2] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(UnsynthesizePubkeys.realToken)],
            isSigner: false,
            isWritable: false
        });
        accounts[3] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(UnsynthesizePubkeys.source)],
            isSigner: false,
            isWritable: true
        });
        accounts[4] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(UnsynthesizePubkeys.destination)],
            isSigner: false,
            isWritable: true
        });
        accounts[5] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(UnsynthesizePubkeys.oppositeBridgeData)],
            isSigner: true,
            isWritable: false
        });
        accounts[6] = SolanaAccountMeta({ pubkey: SOLANA_INSTRUCTIONS, isSigner: false, isWritable: false });
        accounts[7] = SolanaAccountMeta({ pubkey: SOLANA_TOKEN_PROGRAM, isSigner: false, isWritable: false });

        IBridge(_bridge).transmitRequestV2ToSolana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(
                        sighashEmergencyUnsynthesize,
                        bumpSynthesizeRequest,
                        signedMessage.r,
                        signedMessage.s,
                        signedMessage.publicKey,
                        signedMessage.message
                    )
                )
            ),
            pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
            pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            _txID,
            _msgSender(),
            _nonce
        );

        emit RevertSynthesizeRequest(_txID, _msgSender());
    }

    /**
     * @dev Burns given synthetic token and unlocks the original one in the destination chain.
     * @param stoken transaction ID
     * @param amount amount to burn
     * @param to recipient address
     * @param synthParams transfer parameters
     */
    function burnSyntheticToken(
        address stoken,
        uint256 amount,
        address from,
        address to,
        SynthParams calldata synthParams
    ) external returns (bytes32 txID) {
        ISyntERC20(stoken).burn(_msgSender(), amount);
        uint256 _nonce = IBridge(_bridge).getNonce(from);
        txID = RequestIdLib.prepareRqId(
            castToBytes32(synthParams.oppositeBridge),
            synthParams.chainId,
            castToBytes32(synthParams.receiveSide),
            castToBytes32(from),
            _nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("unsynthesize(bytes32,address,uint256,address)"))),
            txID,
            _representationReal[stoken],
            amount,
            to
        );

        IBridge(_bridge).transmitRequestV2(
            out,
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
        txState.stoken = stoken;
        txState.amount = amount;
        txState.state = RequestState.Sent;

        emit BurnRequest(txID, from, to, amount, stoken);
    }

    /* *
     * @dev Burns the original representation of given synthetic token with unsynthesize request and bytes32 support for Solana.
     * @param stoken representation address
     * @param amount amount to burn
     * @param to recipient address
     * @param receiveSide request recipient address
     * @param oppositeBridge opposite bridge address
     * @param chainId opposite chain ID
     */
    function burnSyntheticTokenToSolana(
        address stoken,
        address from,
        bytes32[] calldata pubkeys,
        uint256 amount,
        uint256 chainId
    ) external returns (bytes32 txID) {
        require(chainId == SOLANA_CHAIN_ID, "Synthesis: incorrect chainId");

        // TODO: fix amount digits for solana (digits 18 -> 6)
        require(amount < type(uint64).max, "Synthesis: amount too large");
        uint64 solAmount = uint64(amount);
        // swap bytes
        solAmount = ((solAmount & 0xFF00FF00FF00FF00) >> 8) | ((solAmount & 0x00FF00FF00FF00FF) << 8);
        // swap 2-byte long pairs
        solAmount = ((solAmount & 0xFFFF0000FFFF0000) >> 16) | ((solAmount & 0x0000FFFF0000FFFF) << 16);
        // swap 4-byte long pairs
        solAmount = (solAmount >> 32) | (solAmount << 32);

        ISyntERC20(stoken).burn(_msgSender(), amount);

        uint256 _nonce = IBridge(_bridge).getNonce(from);
        txID = RequestIdLib.prepareRqId(
            pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
            castToBytes32(from),
            _nonce
        );

        SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](9);
        accounts[0] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(UnsynthesizePubkeys.receiveSideData)],
            isSigner: false,
            isWritable: false
        });
        accounts[1] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(UnsynthesizePubkeys.realToken)],
            isSigner: false,
            isWritable: false
        });
        accounts[2] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(UnsynthesizePubkeys.txState)],
            isSigner: false,
            isWritable: true
        });
        accounts[3] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(UnsynthesizePubkeys.source)],
            isSigner: false,
            isWritable: true
        });
        accounts[4] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(UnsynthesizePubkeys.destination)],
            isSigner: false,
            isWritable: true
        });
        accounts[5] = SolanaAccountMeta({
            pubkey: pubkeys[uint256(UnsynthesizePubkeys.oppositeBridgeData)],
            isSigner: true,
            isWritable: false
        });
        accounts[6] = SolanaAccountMeta({ pubkey: SOLANA_TOKEN_PROGRAM, isSigner: false, isWritable: false });
        accounts[7] = SolanaAccountMeta({ pubkey: SOLANA_RENT, isSigner: false, isWritable: false });
        accounts[8] = SolanaAccountMeta({ pubkey: SOLANA_SYSTEM_PROGRAM, isSigner: false, isWritable: false });

        IBridge(_bridge).transmitRequestV2ToSolana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(sighashUnsynthesize, solAmount)
                )
            ),
            pubkeys[uint256(UnsynthesizePubkeys.receiveSide)],
            pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            txID,
            from,
            _nonce
        );

        TxState storage txState = _requests[txID];
        txState.from = castToBytes32(from);
        txState.to = pubkeys[uint256(UnsynthesizePubkeys.destination)];
        txState.stoken = stoken;
        txState.amount = amount;
        txState.state = RequestState.Sent;

        emit BurnRequestSolana(txID, from, pubkeys[uint256(UnsynthesizePubkeys.destination)], amount, stoken);
    }

    /**
     * @dev Emergency unburn request. Can be called only by bridge after initiation on a second chain
     * @param txID transaction ID to use unburn on
     */
    function emergencyUnburn(
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
                "emergencyUnburn(bytes32,address,uint8,bytes32,bytes32)"
            )
        );
        address txOwner = ECDSA.recover(ECDSA.toEthSignedMessageHash(emergencyStructHash), v, r, s);
        require(txState.state == RequestState.Sent, "Synthesis: state not open or tx does not exist");
        require(txState.from == castToBytes32(txOwner), "Synthesis: invalid tx owner");
        txState.state = RequestState.Reverted; // close
        ISyntERC20(txState.stoken).mint(castToAddress(txState.from), txState.amount);

        emit RevertBurnCompleted(txID, castToAddress(txState.from), txState.amount, txState.stoken);
    }

    /**
     * @dev Creates a representation with the given arguments.
     * @param rtoken real token address
     * @param name real token name
     * @param decimals real token decimals number
     * @param symbol real token symbol
     * @param chainId real token chain id
     * @param chainSymbol real token chain symbol
     */
    function createRepresentation(
        bytes32 rtoken,
        uint8 decimals,
        string memory name,
        string memory symbol,
        uint256 chainId,
        string memory chainSymbol
    ) external onlyOwner {
        require(_representationSynt[rtoken] == address(0), "Synthesis: representation already exists");
        require(_representationReal[castToAddress(rtoken)] == 0, "Synthesis: representation already exists");
        address stoken = Create2.deploy(
            0,
            keccak256(abi.encodePacked(rtoken)),
            abi.encodePacked(
                type(SyntERC20).creationCode,
                abi.encode(
                    string(abi.encodePacked("e", name)),
                    string(abi.encodePacked("e", symbol, "(", chainSymbol, ")")),
                    decimals,
                    chainId,
                    rtoken,
                    chainSymbol
                )
            )
        );
        setRepresentation(rtoken, stoken, decimals);
        emit CreatedRepresentation(rtoken, stoken);
    }

    /**
     * @dev Creates a custom representation with the given arguments.
     * @param rtoken real token address
     * @param name real token name
     * @param decimals real token decimals number
     * @param symbol real token symbol
     * @param chainId real token chain id
     * @param chainSymbol real token chain symbol
     */
    function createCustomRepresentation(
        bytes32 rtoken,
        uint8 decimals,
        string memory name,
        string memory symbol,
        uint256 chainId,
        string memory chainSymbol
    ) external onlyOwner {
        require(_representationSynt[rtoken] == address(0), "Synthesis: representation already exists");
        require(_representationReal[castToAddress(rtoken)] == 0, "Synthesis: representation already exists");
        address stoken = Create2.deploy(
            0,
            keccak256(abi.encodePacked(rtoken)),
            abi.encodePacked(
                type(SyntERC20).creationCode,
                abi.encode(name, symbol, decimals, chainId, rtoken, chainSymbol)
            )
        );
        setRepresentation(rtoken, stoken, decimals);
        emit CreatedRepresentation(rtoken, stoken);
    }

    // TODO should be restricted in mainnets (use DAO)
    function changeBridge(address bridge) external onlyOwner {
        _bridge = bridge;
    }

    function setRepresentation(
        bytes32 rtoken,
        address stoken,
        uint8 decimals
    ) internal {
        _representationSynt[rtoken] = stoken;
        _representationReal[stoken] = rtoken;
        _tokenDecimals[rtoken] = decimals;
        keys.push(rtoken);
    }

    /**
     * @dev Get token representation address
     * @param rtoken real token address
     */
    function getRepresentation(bytes32 rtoken) external view returns (address) {
        return _representationSynt[rtoken];
    }

    /**
     * @dev Get token representation list
     */
    function getListRepresentation() external view returns (bytes32[] memory, address[] memory) {
        uint256 len = keys.length;
        address[] memory sToken = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            sToken[i] = _representationSynt[keys[i]];
        }
        return (keys, sToken);
    }

    /**
     * @dev Set new CurveProxy address
     * @param proxy new contract address
     */
    function setCurveProxy(address proxy) external onlyOwner {
        _proxy = proxy;
    }

    /**
     * @dev Sets new trusted forwarder
     * @param forwarder new forwarder address
     */
    function setTrustedForwarder(address forwarder) external onlyOwner {
        return _setTrustedForwarder(forwarder);
    }
}
