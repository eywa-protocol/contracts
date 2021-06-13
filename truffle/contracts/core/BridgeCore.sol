// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BridgeCore {

  modifier onlyOwner() {
      require(msg.sender == _owner, "Ownable: caller is not the owner");
      _;
  }

//TODO: initializer
  function initialize(address listNode) public /*initializer*/ {
      _listNode = listNode;
  }

  address public   _owner;
  address public   _listNode;
  uint256 public   requestCount = 1;
  mapping(address => uint /* bridge => nonce */) public nonce;
  mapping(address => bool) public dexBind;





  function prepareRqId(bytes memory  _selector, address receiveSide, address oppositeBridge, uint chainId) internal returns (bytes32){
    bytes32 requestId = keccak256(abi.encodePacked(this, nonce[oppositeBridge], _selector, receiveSide, oppositeBridge, chainId));
    nonce[oppositeBridge] = nonce[oppositeBridge] + 1;
	return (requestId);
  }

  function updateDexBind(address a, bool f) public onlyOwner {
    dexBind[a] = f;
  }



  event OracleRequest(
  	string  requestType,
    address bridge,
    bytes32 requestId,
    bytes   selector,
    address receiveSide,
    address oppositeBridge,
    uint chainid
  );

  event ReceiveRequest(bytes32 reqId, address receiveSide, bytes32 tx);



}
