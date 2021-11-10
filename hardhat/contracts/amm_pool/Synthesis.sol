// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-newone/utils/math/SafeMath.sol";
import "./IBridge.sol";
import "./ISyntERC20.sol";
import "./SyntERC20.sol";
import "./RelayRecipient.sol";

contract Synthesis is RelayRecipient {
    mapping(address => bytes32) public representationReal;
    mapping(bytes32 => address) public representationSynt;
    bytes32[] private keys;
    mapping(bytes32 => TxState) public requests;
    mapping(bytes32 => SynthesizeState) public synthesizeStates;
    address public bridge;
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

    constructor(address _bridge, address _trustedForwarder) RelayRecipient(_trustedForwarder) {
        bridge = _bridge;
    }

    modifier onlyBridge() {
        require(bridge == msg.sender);
        _;
    }

    struct TxState {
        bytes32 recipient;
        bytes32 chain2address;
        uint256 amount;
        bytes32 token;
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
    ) external onlyBridge {
        require(
            synthesizeStates[_txID] == SynthesizeState.Default,
            "Synt: emergencyUnsynthesizedRequest called or tokens has been already synthesized"
        );

        ISyntERC20(representationSynt[bytes32(uint256(uint160(_tokenReal)))]).mint(_to, _amount);
        synthesizeStates[_txID] = SynthesizeState.Synthesized;

        emit SynthesizeCompleted(_txID, _to, _amount, _tokenReal);
    }

    /** 
    * @dev Mints synthetic token with bytes32 support. Can be called only by bridge after initiation on a second chain
    * @param _txID transaction ID
    * @param _tokenReal real token address 
    * @param _amount amount to mint
    * @param _to recipient address
    */
    function mintSyntheticToken_32(
        bytes32 _txID,
        bytes32 _tokenReal,
        uint256 _amount,
        address _to
    ) external onlyBridge {
        // TODO add chek to Default
        require(
            synthesizeStates[_txID] == SynthesizeState.Default,
            "Synt: emergencyUnsynthesizedRequest called or tokens has been already synthesized"
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
        require(synthesizeStates[_txID] != SynthesizeState.Synthesized, "Synt: syntatic tokens already minted");
        synthesizeStates[_txID] = SynthesizeState.RevertRequest; // close
        bytes memory out = abi.encodeWithSelector(bytes4(keccak256(bytes("emergencyUnsynthesize(bytes32)"))), _txID);
        // TODO add payment by token
        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 txID = IBridge(bridge).prepareRqId(
            bytes32(uint256(uint160(_oppositeBridge))),
            _chainID,
            bytes32(uint256(uint160(_receiveSide))),
            bytes32(uint256(uint160(_msgSender()))),
            nonce
        );
        IBridge(bridge).transmitRequestV2(out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);

        emit RevertSynthesizeRequest(txID, _msgSender());
    }

    /** 
    * @dev Revert synthesize() operation with bytes32 support. Can be called several times
    * @param _txID transaction ID
    * @param _receiveSide request recipient address 
    * @param _oppositeBridge opposite bridge address
    * @param _chainID opposite chain ID
    */
    function emergencyUnsyntesizeRequest_32(
        bytes32 _txID,
        bytes32 _receiveSide,
        bytes32 _oppositeBridge,
        uint256 _chainID
    ) external {
        require(synthesizeStates[_txID] != SynthesizeState.Synthesized, "Synt: syntatic tokens already minted");
        synthesizeStates[_txID] = SynthesizeState.RevertRequest; // close
        bytes memory out = abi.encodeWithSelector(bytes4(keccak256(bytes("emergencyUnsynthesize(bytes32)"))), _txID);
        // TODO add payment by token
        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 txID = IBridge(bridge).prepareRqId(
            _oppositeBridge,
            _chainID,
            _receiveSide,
            bytes32(uint256(uint160(_msgSender()))),
            nonce
        );
        IBridge(bridge).transmitRequestV2_32(out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);

        emit RevertSynthesizeRequest(txID, _msgSender());
    }

    /** 
    * @dev Burns synthetic token with unsynthesize request.
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
            bytes32(uint256(uint160(_oppositeBridge))),
            _chainID,
            bytes32(uint256(uint160(_receiveSide))),
            bytes32(uint256(uint160(_msgSender()))),
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
        txState.recipient = bytes32(uint256(uint160(_msgSender())));
        txState.chain2address = bytes32(uint256(uint160(_chain2address)));
        txState.stoken = _stoken;
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit BurnRequest(txID, _msgSender(), _chain2address, _amount, _stoken);
    }

    /** 
    * @dev Burns synthetic token with unsynthesize request and bytes32 support.
    * @param _stoken representation address
    * @param _amount amount to burn
    * @param _chain2address recipient address
    * @param _receiveSide request recipient address
    * @param _oppositeBridge opposite bridge address
    * @param _chainID opposite chain ID
    */
    function burnSyntheticToken_32(
        address _stoken,
        uint256 _amount,
        bytes32 _chain2address,
        bytes32 _receiveSide,
        bytes32 _oppositeBridge,
        uint256 _chainID
    ) external returns (bytes32 txID) {
        ISyntERC20(_stoken).burn(_msgSender(), _amount);
        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            _oppositeBridge,
            _chainID,
            _receiveSide,
            bytes32(uint256(uint160(_msgSender()))),
            nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("unsynthesize(bytes32,bytes32,uint256,bytes32)"))),
            txID,
            representationReal[_stoken],
            _amount,
            _chain2address
        );
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2_32(out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);
        TxState storage txState = requests[txID];
        txState.recipient = bytes32(uint256(uint160(_msgSender())));
        txState.chain2address = _chain2address;
        txState.stoken = _stoken;
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit BurnRequestSolana(txID, _msgSender(), _chain2address, _amount, _stoken);
    }

    // /** 
    // * @dev Burns synthetic token with permit. unsynthesize request and bytes32 support.
    // * @param _stoken transaction ID
    // * @param _amount amount to burn
    // * @param _chain2address recipient address
    // * @param _receiveSide request recipient address
    // * @param _oppositeBridge opposite bridge address
    // * @param _chainID opposite chain ID
    // */
    // function burnSyntheticTokenWithPermit(
    //     bytes calldata _approvalData,
    //     address _stoken,
    //     uint256 _amount,
    //     address _chain2address,
    //     address _receiveSide,
    //     address _oppositeBridge,
    //     uint256 _chainID
    // ) external returns (bytes32 txID) {
    //     (bool _success1, ) = _stoken.call(_approvalData);
    //     require(_success1, "Approve call failed");

    //     ISyntERC20(_stoken).burn(_msgSender(), _amount);
    //     uint256 nonce = IBridge(bridge).getNonce(_msgSender());

    //     txID = IBridge(bridge).prepareRqId(
    //         bytes32(uint256(uint160(_oppositeBridge))),
    //         _chainID,
    //         bytes32(uint256(uint160(_receiveSide))),
    //         bytes32(uint256(uint160(_msgSender()))),
    //         nonce
    //     );

    //     bytes memory out = abi.encodeWithSelector(
    //         bytes4(keccak256(bytes("unsynthesize(bytes32,address,uint256,address)"))),
    //         txID,
    //         representationReal[_stoken],
    //         _amount,
    //         _chain2address
    //     );
    //     // TODO add payment by token
    //     IBridge(bridge).transmitRequestV2(out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);
    //     TxState storage txState = requests[txID];
    //     txState.recipient = bytes32(uint256(uint160(_msgSender())));
    //     txState.chain2address = bytes32(uint256(uint160(_chain2address)));
    //     txState.stoken = _stoken;
    //     txState.amount = _amount;
    //     txState.state = RequestState.Sent;

    //     emit BurnRequest(txID, _msgSender(), _chain2address, _amount, _stoken);
    // }

    // // Solana
    // function burnSyntheticTokenWithPermit_32(
    //     bytes calldata _approvalData,
    //     address _stoken,
    //     uint256 _amount,
    //     bytes32 _chain2address,
    //     bytes32 _receiveSide,
    //     bytes32 _oppositeBridge,
    //     uint256 _chainID
    // ) external returns (bytes32 txID) {
    //     (bool _success1, ) = _stoken.call(_approvalData);
    //     require(_success1, "Approve call failed");

    //     ISyntERC20(_stoken).burn(_msgSender(), _amount);
    //     uint256 nonce = IBridge(bridge).getNonce(_msgSender());

    //     txID = IBridge(bridge).prepareRqId(
    //         _oppositeBridge,
    //         _chainID,
    //         _receiveSide,
    //         bytes32(uint256(uint160(_msgSender()))),
    //         nonce
    //     );

    //     bytes memory out = abi.encodeWithSelector(
    //         bytes4(keccak256(bytes("unsynthesize(bytes32,bytes32,uint256,bytes32)"))),
    //         txID,
    //         representationReal[_stoken],
    //         _amount,
    //         _chain2address
    //     );
    //     // TODO add payment by token
    //     IBridge(bridge).transmitRequestV2_32(out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);
    //     TxState storage txState = requests[txID];
    //     txState.recipient = bytes32(uint256(uint160(_msgSender())));
    //     txState.chain2address = _chain2address;
    //     txState.stoken = _stoken;
    //     txState.amount = _amount;
    //     txState.state = RequestState.Sent;

    //     emit BurnRequestSolana(txID, _msgSender(), _chain2address, _amount, _stoken);
    // }


    /** 
    * @dev Emergency unburn request. Can be called only by bridge after initiation on a second chain
    * @param _txID transaction ID to use unburn on
    */
    function emergencyUnburn(bytes32 _txID) external onlyBridge {
        TxState storage txState = requests[_txID];
        require(txState.state == RequestState.Sent, "Synt: state not open or tx does not exist");
        txState.state = RequestState.Reverted; // close
        ISyntERC20(txState.stoken).mint(address(uint160(uint256(txState.recipient))), txState.amount);

        emit RevertBurnCompleted(_txID, address(uint160(uint256(txState.recipient))), txState.amount, txState.stoken);
    }

    /** 
    * @dev Creates a representation with the given arguments.
    * @param _rtoken real token address
    * @param _stokenName synth token name
    * @param _stokenSymbol synth token name symbol
    */
    function createRepresentation(
        bytes32 _rtoken,
        string memory _stokenName,
        string memory _stokenSymbol
    ) external onlyOwner {
        //address stoken = representationSynt[_rtoken];
        //require(stoken == address(0x0), "Synt: token representation already exist");
        SyntERC20 syntToken = new SyntERC20(_stokenName, _stokenSymbol);
        setRepresentation(_rtoken, address(syntToken));
    }

    // should be restricted in mainnets
    function changeBridge(address _bridge) external onlyOwner {
        bridge = _bridge;
    }

    function versionRecipient() public view returns (string memory) {
        return "2.0.1";
    }

    // utils
    function setRepresentation(bytes32 _rtoken, address _stoken) internal {
        representationSynt[_rtoken] = _stoken;
        representationReal[_stoken] = _rtoken;
        keys.push(_rtoken);
    }

    function getListRepresentation() external view returns (bytes32[] memory, address[] memory) {
        uint256 len = keys.length;
        address[] memory sToken = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            sToken[i] = representationSynt[keys[i]];
        }
        return (keys, sToken);
    }
}
