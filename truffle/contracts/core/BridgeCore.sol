// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BridgeCore {

//TODO: initializer
  function initialize(address listNode) public /*initializer*/ {
      _listNode = listNode;
  }

  address public    _listNode;
  uint256 private   requestCount = 1;
  mapping(address => bool) public whiteList;
  mapping(uint => address) public externalBridgesByChainId;


  function addBridge(address bridge, uint chainId) public /*onlyOwner,*/ notRegisterdBridgeForChain {
    externalBridgesByChainId[chainId] = bridge;
  }



  function getBridgeByChainId(uint chainId) public /*onlyOwner*/ returns (address) {
    return externalBridgesByChainId[chainId];
  }


  function prepareRqId(bytes memory  _selector, address receiveSide, uint chainId) internal returns (bytes32, address){
    address oppositeBridge = getBridgeByChainId(chainId);
    bytes32 requestId = keccak256(abi.encodePacked(this, requestCount, _selector, receiveSide, oppositeBridge));
    requestCount += 1;
	return (requestId, oppositeBridge);
  }

  function setControl(address a) public /*onlyOwner*/ {
    whiteList[a] = true;
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

  event ReceiveRequest(string reqId, address receiveSide, bytes32 tx);

  modifier notRegisterdBridgeForChain(uint chainID) {
    require ( getBridgeByChainId(chainId) == address(0), "bridge allready registered");
    _;
  }

}
