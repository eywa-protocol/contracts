// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./core/BridgeCore.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Bridge is BridgeCore {

  //TODO: permossion for dex





  function transmitRequestV2(bytes memory  _selector, address receiveSide)
    public
    /*onlyOwner*/
    returns (bytes32)
  {
	require(address(0) != receiveSide, 'BAD RECEIVE SIDE');
    //require(msg.sender == myContract, "ONLY PERMISSIONED ADDRESS");

	(bytes32 requestId, address oppositeBridge) = prepareRqId(_selector, receiveSide);
  	emit OracleRequest("setRequest", address(this), requestId, _selector, receiveSide, oppositeBridge);

  	return requestId;
  }


  //==============================================================================================================


  function receiveRequestV2(string memory reqId,
                          bytes memory signature,
                          bytes memory b,
                          bytes32 tx,
                          address receiveSide) external {

  	//check out nonce == bridge1 nonce, sign || sing bridge1 && schoor consensys

  	
    bytes32 hash     = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(reqId, b, tx, receiveSide)));
    address res      = ECDSA.recover(hash, signature);
    require(true == whiteList[res], 'SECURITY EVENT');

    (bool success, bytes memory data) = receiveSide.call(b);
	require(success && (data.length == 0 || abi.decode(data, (bool))), 'FAILED');

	emit ReceiveRequest(reqId, receiveSide, tx);
  }
}