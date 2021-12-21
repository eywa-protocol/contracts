// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-newone/access/Ownable.sol";
import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-newone/utils/math/SafeMath.sol";
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

    bytes public constant sighashUnsynthesize =
        abi.encodePacked(uint8(115), uint8(234), uint8(111), uint8(109), uint8(131), uint8(167), uint8(37), uint8(70));
    bytes public constant sighashEmergencyUnsynthesize =
        abi.encodePacked(uint8(102), uint8(107), uint8(151), uint8(50), uint8(141), uint8(172), uint8(244), uint8(63));

    enum UnsynthesizePubkeys {
        callDestination,
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

    event BurnRequest(bytes32 indexed _id, address indexed _from, address indexed to, uint256 amount, address _token);
    event BurnRequestSolana(
        bytes32 indexed _id,
        address indexed _from,
        bytes32 indexed to,
        uint256 amount,
        address _token
    );
    event RevertSynthesizeRequest(bytes32 indexed _id, address indexed to);
    event SynthesizeCompleted(bytes32 indexed _id, address indexed to, uint256 amount, address _token);
    event SynthesizeCompletedSolana(bytes32 indexed _id, address indexed to, uint256 amount, bytes32 _token);
    event RevertBurnCompleted(bytes32 indexed _id, address indexed to, uint256 amount, address _token);
    event CreatedRepresentation(bytes32 indexed rtoken, address indexed stoken);

    constructor(address _bridge, address _trustedForwarder) RelayRecipient(_trustedForwarder) {
        bridge = _bridge;
    }

    modifier onlyBridge() {
        require(bridge == msg.sender);
        _;
    }

    modifier onlyTrusted() {
        require(bridge == msg.sender || proxy == msg.sender);
        _;
    }

    struct TxState {
        bytes32 sender;
        bytes32 recipientAddress;
        uint256 amount;
        bytes32 token;
        address stoken;
        RequestState state;
    }

    /**
     * @dev Mints synthetic token. Can be called only by bridge after initiation on a second chain
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
            synthesizeStates[txID] == SynthesizeState.Default,
            "Synt: emergencyUnsynthesizedRequest called or tokens has been already synthesized"
        );

        ISyntERC20(representationSynt[castToBytes32(tokenReal)]).mint(to, amount);
        synthesizeStates[txID] = SynthesizeState.Synthesized;

        emit SynthesizeCompleted(txID, to, amount, tokenReal);
    }

    /**
     * @dev Mints synthetic token with bytes32 support for Solana. Can be called only by bridge after initiation on a second chain
     * @param txID transaction ID
     * @param tokenReal real token address
     * @param amount amount to mint
     * @param to recipient address
     */
    function mintSyntheticToken_solana(
        bytes32 txID,
        bytes32 tokenReal,
        uint256 amount,
        address to
    ) external onlyBridge {
        // TODO add chek to Default
        require(
            synthesizeStates[txID] == SynthesizeState.Default,
            "Synt: emergencyUnsynthesizedRequest called or tokens has been already synthesized"
        );

        ISyntERC20(representationSynt[tokenReal]).mint(to, amount);
        synthesizeStates[txID] = SynthesizeState.Synthesized;

        emit SynthesizeCompletedSolana(txID, to, amount, tokenReal);
    }

    /**
     * @dev Revert synthesize() operation, can be called several times
     * @param txID transaction ID
     * @param callDestination request recipient address
     * @param oppositeBridge opposite bridge address
     * @param chainID opposite chain ID
     */
    function emergencyUnsyntesizeRequest(
        bytes32 txID,
        address callDestination,
        address oppositeBridge,
        uint256 chainID
    ) external {
        require(synthesizeStates[txID] != SynthesizeState.Synthesized, "Synt: syntatic tokens already minted");
        synthesizeStates[txID] = SynthesizeState.RevertRequest; // close
        bytes memory out = abi.encodeWithSelector(bytes4(keccak256(bytes("emergencyUnsynthesize(bytes32)"))), txID);
        // TODO add payment by token
        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 _txID = IBridge(bridge).prepareRqId(
            castToBytes32(oppositeBridge),
            chainID,
            castToBytes32(callDestination),
            castToBytes32(_msgSender()),
            nonce
        );
        IBridge(bridge).transmitRequestV2(out, callDestination, oppositeBridge, chainID, _txID, _msgSender(), nonce);

        emit RevertSynthesizeRequest(_txID, _msgSender());
    }

    /**
     * @dev Revert synthesize() operation with bytes32 support for Solana. Can be called several times
     * @param pubkeys unsynth data for Solana
     * @param bumpSynthesizeRequest synthesize request bump
     * @param chainId opposite chain ID
     */
    function emergencyUnsyntesizeRequest_solana(
        bytes32[] calldata pubkeys,
        bytes1 bumpSynthesizeRequest,
        uint256 chainId
    ) external {
        require(chainId == SOLANA_CHAIN_ID, "incorrect chainId");

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 txID = IBridge(bridge).prepareRqId(
            pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            pubkeys[uint256(UnsynthesizePubkeys.callDestination)],
            castToBytes32(_msgSender()),
            nonce
        );

        require(synthesizeStates[txID] != SynthesizeState.Synthesized, "Synt: syntatic tokens already minted");
        synthesizeStates[txID] = SynthesizeState.RevertRequest; // close

        SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](7);
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
        accounts[6] = SolanaAccountMeta({ pubkey: SOLANA_TOKEN_PROGRAM, isSigner: false, isWritable: false });

        // TODO add payment by token
        IBridge(bridge).transmitRequestV2_solana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    pubkeys[uint256(UnsynthesizePubkeys.callDestination)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(sighashEmergencyUnsynthesize, bumpSynthesizeRequest)
                )
            ),
            pubkeys[uint256(UnsynthesizePubkeys.callDestination)],
            pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            txID,
            _msgSender(),
            nonce
        );

        emit RevertSynthesizeRequest(txID, _msgSender());
    }

    /**
     * @dev Burns synthetic token with unsynthesize request.
     * @param stoken transaction ID
     * @param amount amount to burn
     * @param recipientAddress recipient address
     * @param callDestination request recipient address
     * @param oppositeBridge opposite bridge address
     * @param chainID opposite chain ID
     */
    function burnSyntheticToken(
        address stoken,
        uint256 amount,
        address recipientAddress,
        address callDestination,
        address oppositeBridge,
        uint256 chainID
    ) external returns (bytes32 txID) {
        ISyntERC20(stoken).burn(_msgSender(), amount);
        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            castToBytes32(oppositeBridge),
            chainID,
            castToBytes32(callDestination),
            castToBytes32(_msgSender()),
            nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("unsynthesize(bytes32,address,uint256,address)"))),
            txID,
            representationReal[stoken],
            amount,
            recipientAddress
        );
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(out, callDestination, oppositeBridge, chainID, txID, _msgSender(), nonce);
        TxState storage txState = requests[txID];
        txState.sender = castToBytes32(_msgSender());
        txState.recipientAddress = castToBytes32(recipientAddress);
        txState.stoken = stoken;
        txState.amount = amount;
        txState.state = RequestState.Sent;

        emit BurnRequest(txID, _msgSender(), recipientAddress, amount, stoken);
    }

    /* *
     * @dev Burns synthetic token with unsynthesize request and bytes32 support for Solana.
     * @param stoken representation address
     * @param amount amount to burn
     * @param recipientAddress recipient address
     * @param callDestination request recipient address
     * @param oppositeBridge opposite bridge address
     * @param chainId opposite chain ID
     */
    function burnSyntheticToken_solana(
        address stoken,
        bytes32[] calldata pubkeys,
        uint256 amount,
        uint256 chainId
    ) external returns (bytes32 txID) {
        require(chainId == SOLANA_CHAIN_ID, "incorrect chainId");

        // TODO: fix amount digits for solana (digits 18 -> 6)
        require(amount < type(uint64).max, "amount too large");
        uint64 solAmount = uint64(amount);
        // swap bytes
        solAmount = ((solAmount & 0xFF00FF00FF00FF00) >> 8) | ((solAmount & 0x00FF00FF00FF00FF) << 8);
        // swap 2-byte long pairs
        solAmount = ((solAmount & 0xFFFF0000FFFF0000) >> 16) | ((solAmount & 0x0000FFFF0000FFFF) << 16);
        // swap 4-byte long pairs
        solAmount = (solAmount >> 32) | (solAmount << 32);

        ISyntERC20(stoken).burn(_msgSender(), amount);

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            pubkeys[uint256(UnsynthesizePubkeys.callDestination)],
            castToBytes32(_msgSender()),
            nonce
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

        // TODO add payment by token
        IBridge(bridge).transmitRequestV2_solana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                    /* programId: */
                    pubkeys[uint256(UnsynthesizePubkeys.callDestination)],
                    /* accounts: */
                    accounts,
                    /* data: */
                    abi.encodePacked(sighashUnsynthesize, solAmount)
                )
            ),
            pubkeys[uint256(UnsynthesizePubkeys.callDestination)],
            pubkeys[uint256(UnsynthesizePubkeys.oppositeBridge)],
            SOLANA_CHAIN_ID,
            txID,
            _msgSender(),
            nonce
        );

        TxState storage txState = requests[txID];
        txState.sender = castToBytes32(_msgSender());
        txState.recipientAddress = pubkeys[uint256(UnsynthesizePubkeys.destination)];
        txState.stoken = stoken;
        txState.amount = amount;
        txState.state = RequestState.Sent;

        emit BurnRequestSolana(txID, _msgSender(), pubkeys[uint256(UnsynthesizePubkeys.destination)], amount, stoken);
    }

    /**
     * @dev Emergency unburn request. Can be called only by bridge after initiation on a second chain
     * @param txID transaction ID to use unburn on
     */
    function emergencyUnburn(bytes32 txID) external onlyBridge {
        TxState storage txState = requests[txID];
        require(txState.state == RequestState.Sent, "Synt: state not open or tx does not exist");
        txState.state = RequestState.Reverted; // close
        ISyntERC20(txState.stoken).mint(castToAddress(txState.recipient), txState.amount);

        emit RevertBurnCompleted(txID, castToAddress(txState.recipient), txState.amount, txState.stoken);
    }

    /**
     * @dev Creates a representation with the given arguments.
     * @param rtoken real token address
     * @param name real token name
     * @param symbol real token symbol
     */
    function createRepresentation(
        bytes32 rtoken,
        string memory name,
        string memory symbol
    ) external onlyOwner {
        require(representationSynt[rtoken] == address(0), "Representation already exists");
        require(representationReal[castToAddress(rtoken)] == 0, "Representation already exists");
        address stoken = Create2.deploy(
            0,
            keccak256(abi.encodePacked(rtoken)),
            abi.encodePacked(
                type(SyntERC20).creationCode,
                abi.encode(string(abi.encodePacked("e", name)), string(abi.encodePacked("e", symbol)))
            )
        );
        setRepresentation(rtoken, stoken);
        emit CreatedRepresentation(rtoken, stoken);
    }

    // should be restricted in mainnets
    function changeBridge(address _bridge) external onlyOwner {
        bridge = _bridge;
    }

    function versionRecipient() public pure returns (string memory) {
        return "2.0.1";
    }

    // utils
    function setRepresentation(bytes32 rtoken, address stoken) internal {
        representationSynt[rtoken] = stoken;
        representationReal[stoken] = rtoken;
        keys.push(rtoken);
    }

    function getRepresentation(bytes32 rtoken) external view returns (address) {
        return representationSynt[rtoken];
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
        address stoken,
        uint256 amount,
        address recipientAddress,
        address callDestination,
        address oppositeBridge,
        uint256 chainID,
        bytes memory out
    ) external returns (bytes32 txID) {
        ISyntERC20(stoken).burn(_msgSender(), amount);
        uint256 nonce = IBridge(bridge).getNonce(_msgSender());

        txID = IBridge(bridge).prepareRqId(
            castToBytes32(oppositeBridge),
            chainID,
            castToBytes32(callDestination),
            castToBytes32(_msgSender()),
            nonce
        );

        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(out, callDestination, oppositeBridge, chainID, txID, _msgSender(), nonce);
        TxState storage txState = requests[txID];
        txState.state = RequestState.Sent;

        emit BurnRequest(txID, _msgSender(), recipientAddress, amount, stoken);
    }
}
