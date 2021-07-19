// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <=0.8.0;


//WARN: Before release should be baned trustListForDex into addNode
contract NodeList {

  struct Node {
  	bool    enable;
    address nodeWallet;
    bytes   p2pAddress;
    address blsPointAddr;
    bytes   blsPubKey;
    uint64 nodeId;
  }

   mapping (address => Node) public listNode;
   mapping (address => mapping(address => bool)) /** node => brigde => permission */  public trustListForDex;
   address[] public p2pAddrs;
    Node[] public nodes;

    event AddedNode(bytes _p2pAddress, bytes _blsPubKey);

//TODO: discuss about check: listNode[_blsPointAddr] == address(0)
  function addNode(address _nodeWallet, bytes memory _p2pAddress, address _blsPointAddr, bytes memory _blsPubKey, bool _enable) external isNewNode(_blsPointAddr) /*onlyOwner*/ {
      require(_nodeWallet != address(0), "0 address");
      require(_blsPointAddr != address(0), "0 address");
      Node storage node = listNode[_blsPointAddr];
      node.nodeId  = getNewNodeId();
      node.nodeWallet   = _nodeWallet;
      node.p2pAddress   = _p2pAddress;
      node.blsPointAddr = _blsPointAddr;
      node.blsPubKey    = _blsPubKey;
      node.enable       = _enable;
      p2pAddrs.push(_blsPointAddr);
      nodes.push(node);
//TODO: discuss about pemission for certain bridge
      trustListForDex[_nodeWallet][address(0)] = true;

      emit AddedNode(node.p2pAddress, node.blsPubKey);
  }

    function getNewNodeId() internal returns (uint64){
        return uint64(nodes.length);
    }

  function getNode(address _blsPubAddr) external view returns (Node memory)  {
  	return listNode[_blsPubAddr];
  }

  function getAllNodesAddrs() external view returns (address[] memory) {
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

    function getBLSPubKeys() external view returns (bytes[] memory){
        bytes[] memory pubKeys = new bytes[](p2pAddrs.length);
        for (uint i = 0; i < p2pAddrs.length; i++) {
            Node storage node = listNode[p2pAddrs[i]];
            pubKeys[i] = node.blsPubKey;
        }
        return pubKeys;
    }

    function getNodeBLSAddrs() external view returns (address[] memory){
        address[] memory blsAddrs= new address[](p2pAddrs.length);
        for (uint i = 0; i < p2pAddrs.length; i++) {
            Node storage node = listNode[p2pAddrs[i]];
            blsAddrs[i] = node.blsPointAddr;
        }
        return blsAddrs;
    }

    modifier isNewNode(address _nodeBLSAddr) {
        require(listNode[_nodeBLSAddr].blsPointAddr == address(0),string(abi.encodePacked("node ", convertToString(_nodeBLSAddr), " allready exists")));
        _;
    }

    modifier existingNode(address addr) {
        require(listNode[addr].blsPointAddr != address(0), string(abi.encodePacked("node ", convertToString(addr), " does not exist")));
        _;
    }



    /// @notice Преобразовать адрес в строку для require()
    function convertToString(address account) public pure returns (string memory s) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory data = abi.encodePacked(account);
        bytes memory result = new bytes(2 + data.length * 2);
        result[0] = '0';
        result[1] = 'x';
        for (uint i = 0; i < data.length; i++) {
            result[2+i*2] = alphabet[uint(uint8(data[i] >> 4))];
            result[3+i*2] = alphabet[uint(uint8(data[i] & 0x0f))];
        }
        return string(result);
    }

    function nodeExists(address _blsPubAddr) public view returns (bool) {
        return listNode[_blsPubAddr].blsPointAddr != address(0);
    }

  function checkPermissionTrustList(address node) external view returns (bool)  {
    return trustListForDex[node][address(0)];
  }
}
