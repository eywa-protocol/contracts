// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract NodeList {

  struct Node {
  	bool    enable;
    address nodeWallet;
    bytes   p2pAddress;
    bytes pubKey;

  }


   mapping (bytes => Node) public listNode;
   bytes[] private p2pAddrs;

  function addNode(address _nodeWallet, bytes memory _p2pAddress, bytes calldata _pubKey, bool _enable) external isNewNode(_p2pAddress) /*onlyOwner*/ {
      require(_nodeWallet != address(0), "0 address");
      Node storage node = listNode[_p2pAddress];
      node.nodeWallet   = _nodeWallet;
      node.p2pAddress   = _p2pAddress;
      node.pubKey       = _pubKey;
      node.enable       = _enable;
      p2pAddrs.push(_p2pAddress);
  }

  function getNode(bytes memory _nodeAddr) external view returns (Node memory) {
  	return listNode[_nodeAddr];
  }

  function getAllNodesAddrs() external view returns (bytes[] memory) {
  	return p2pAddrs;
  }

  function getNodes() external view returns (Node[] memory){
      Node[] memory nodes = new Node[](p2pAddrs.length);
      for (uint i = 0; i < p2pAddrs.length; i++) {
          Node storage node = listNode[p2pAddrs[i]];
          nodes[i] = node;
      }
      return nodes;
  }

    modifier isNewNode(bytes memory _nodeAddr) {
        require(listNode[_nodeAddr].nodeWallet == address(0),"node allready exists");
        _;
    }

}
