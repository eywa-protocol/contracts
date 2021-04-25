// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract NodeList {

  struct Node {
  	bool    enable;
    address nodeWallet;
    bytes   p2pAddress;
    bytes32 pubKey;
    
  }


   mapping (address => Node) public listNode;
   address[] private keys;

  function addNode(address _nodeWallet, bytes memory _p2pAddress, bytes32 _pubKey, bool _enable) external /*onlyOwner*/ {
      Node storage node = listNode[_nodeWallet];
      node.nodeWallet   = _nodeWallet;
      node.p2pAddress   = _p2pAddress;
      node.pubKey       = _pubKey;
      node.enable       = _enable;
      keys.push(_nodeWallet);
  }

  function getNode(address _nodeWallet) external view returns (Node memory) {
  	return listNode[_nodeWallet];
  }

  function getAllNodeWallet() external view returns (address[] memory) {
  	return keys;
  }

}