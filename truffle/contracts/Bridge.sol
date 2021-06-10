// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./core/BridgeCore.sol";
import "./interface/ListNodeInterface.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Bridge is BridgeCore {


  modifier onlyTrustedNode() {
    require(ListNodeInterface(_listNode).checkPermissionTrustList(msg.sender) == true, "Only trusted node can invoke");
    _;
  }


  constructor(address listNode) public {
    _listNode = listNode;
  }


  function transmitRequestV2(bytes memory  _selector, address receiveSide,  address oppositeBridge, uint chainId)
    public
    /*onlyOwner*/
    returns (bytes32)
  {
	require(address(0) != receiveSide, 'BAD RECEIVE SIDE');
    //require(msg.sender == myContract, "ONLY PERMISSIONED ADDRESS");
	bytes32 requestId = prepareRqId(_selector, receiveSide, oppositeBridge, chainId);
  	emit OracleRequest("setRequest", address(this), requestId, _selector, receiveSide, oppositeBridge, chainId);

  	return requestId;
  }


  //==============================================================================================================


 function receiveRequestV2(string memory reqId,
                         bytes memory signature,
                         bytes memory b,
                         bytes32 tx,
                         address receiveSide) onlyTrustedNode external {


  	//check out nonce == bridge1 nonce, sign || sing bridge1 && schoor consensys


//    bytes32 hash     = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(reqId, b, tx, receiveSide)));
//    address res      = ECDSA.recover(hash, signature);
//    require(true == whiteList[res], 'SECURITY EVENT');

  (bool success, bytes memory data) = receiveSide.call(b);
	require(success && (data.length == 0 || abi.decode(data, (bool))), 'FAILED');

	emit ReceiveRequest("0x2", address(0), "0x1");
  }

      function receiveRequestV2() external {
           emit ReceiveRequest("0x2", address(0), "0x1");
      }
}
