// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-newone/utils/math/SafeMath.sol";
import "./IBridge.sol";
import "./ISyntERC20.sol";
import "./SyntERC20.sol";
import "./RelayRecipient.sol";


contract Synthesis is RelayRecipient {

    mapping (address => address) public representationReal;
    mapping (address => address) public representationSynt;
    address[] private keys;
    uint256 requestCount = 1;
    mapping (bytes32 => TxState) public requests;
    mapping (bytes32 => SynthesizeState) public synthesizeStates;
    address public bridge;
    string public versionRecipient = "2.2.3";
    enum RequestState { Default, Sent, Reverted}
    enum SynthesizeState { Default, Synthesized, RevertRequest}

    event BurnRequest(bytes32 indexed _id, address indexed _from, address indexed _to, uint _amount,address _token);
    event RevertSynthesizeRequest(bytes32 indexed _id, address indexed _to);
    event SynthesizeCompleted(bytes32 indexed _id, address indexed _to, uint _amount, address _token);
    event RevertBurnCompleted(bytes32 indexed _id, address indexed _to, uint _amount, address _token);

    constructor (address _bridge, address _trustedForwarder) {
        bridge = _bridge;
        _setTrustedForwarder(_trustedForwarder);
    }

    modifier onlyBridge {
        require(bridge == msg.sender);
        _;
    }

    struct TxState {
        address recipient;
        address chain2address;
        uint256 amount;
        address token;
        address stoken;
        RequestState state;
    }    
    
    function setTrustedForwarder(address _forwarder) external onlyOwner {
       return _setTrustedForwarder(_forwarder);
    }


    // can called only by bridge after initiation on a second chain
    function mintSyntheticToken(bytes32 _txID, address _tokenReal, uint256 _amount, address _to) external onlyBridge {
        // TODO add chek to Default - чтобы не было по бриджу
        require(synthesizeStates[_txID] == SynthesizeState.Default, "Synt: emergencyUnsynthesizedRequest called or tokens has been already synthesized");

        ISyntERC20(representationSynt[_tokenReal]).mint(_to, _amount);
        synthesizeStates[_txID] = SynthesizeState.Synthesized;

        emit SynthesizeCompleted(_txID, _to, _amount, _tokenReal);
    }

    // Revert synthesize() operation, can be called several times
    function emergencyUnsyntesizeRequest(bytes32 _txID,address _receiveSide, address _oppositeBridge, uint _chainID) external {

        require(synthesizeStates[_txID]!= SynthesizeState.Synthesized, "Synt: syntatic tokens already minted");
        synthesizeStates[_txID] = SynthesizeState.RevertRequest;// close
        bytes memory out  = abi.encodeWithSelector(bytes4(keccak256(bytes('emergencyUnsynthesize(bytes32)'))),_txID);
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(out,_receiveSide, _oppositeBridge, _chainID);

        emit RevertSynthesizeRequest(_txID, _msgSender());
    }

    // sToken -> Token on a second chain
    function burnSyntheticToken(
        address _stoken,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint _chainID
    ) external returns (bytes32 txID) {
        ISyntERC20(_stoken).burn(_msgSender(), _amount);
        txID = keccak256(abi.encodePacked(this, requestCount));

        bytes memory out  = abi.encodeWithSelector(bytes4(keccak256(bytes('unsynthesize(bytes32,address,uint256,address)'))),txID, representationReal[_stoken], _amount, _chain2address);
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(out, _receiveSide, _oppositeBridge, _chainID);
        TxState storage txState = requests[txID];
        txState.recipient    = _msgSender();
        txState.chain2address    = _chain2address;
        txState.stoken     = _stoken;
        txState.amount     = _amount;
        txState.state = RequestState.Sent;

        requestCount += 1;

        emit BurnRequest(txID, _msgSender(), _chain2address, _amount, _stoken);
    }

    function burnSyntheticTokenWithPermit(
        bytes calldata _approvalData,
        address _stoken,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint _chainID
    ) external returns (bytes32 txID) {
        (bool _success1, ) = _stoken.call(_approvalData);
        require(_success1, "Approve call failed");

        ISyntERC20(_stoken).burn(_msgSender(), _amount);
        txID = keccak256(abi.encodePacked(this, requestCount));

        bytes memory out  = abi.encodeWithSelector(bytes4(keccak256(bytes('unsynthesize(bytes32,address,uint256,address)'))),txID, representationReal[_stoken], _amount, _chain2address);
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(out, _receiveSide, _oppositeBridge, _chainID);
        TxState storage txState = requests[txID];
        txState.recipient    = _msgSender();
        txState.chain2address    = _chain2address;
        txState.stoken     = _stoken;
        txState.amount     = _amount;
        txState.state = RequestState.Sent;

        requestCount += 1;

        emit BurnRequest(txID, _msgSender(), _chain2address, _amount, _stoken);
    }

    // can called only by bridge after initiation on a second chain
    function emergencyUnburn(bytes32 _txID) external onlyBridge {
        TxState storage txState = requests[_txID];
        require(txState.state ==  RequestState.Sent, 'Synt: state not open or tx does not exist');
        txState.state = RequestState.Reverted; // close
        ISyntERC20(txState.stoken).mint(txState.recipient, txState.amount);

        emit RevertBurnCompleted(_txID, txState.recipient, txState.amount, txState.stoken);
    }

    function createRepresentation(address _rtoken, string memory _stokenName,string memory _stokenSymbol) external onlyOwner {
        //address stoken = representationSynt[_rtoken];
        //require(stoken == address(0x0), "Synt: token representation already exist");
        SyntERC20 syntToken = new SyntERC20(_stokenName,_stokenSymbol);
        setRepresentation(_rtoken, address(syntToken));
    }

    // should be restricted in mainnets
    function changeBridge(address _bridge) external onlyOwner {
        bridge = _bridge;
    }

    // utils
    function setRepresentation (address _rtoken, address _stoken) internal {
        representationSynt[_rtoken] = _stoken;
        representationReal[_stoken] = _rtoken;
        keys.push(_rtoken);
    }

    function getListRepresentation() external view returns(address[] memory, address[] memory) {
       uint256 len = keys.length;
       address[] memory sToken = new address[](len);
       for (uint256 i = 0; i < len; i++) {
          sToken[i] = representationSynt[keys[i]];
       }
       return (keys, sToken);
    }

    function getRepresentation(address _rtoken) external view returns (address){
        return representationSynt[_rtoken];
    }

}
