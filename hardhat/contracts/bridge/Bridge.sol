// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./core/BridgeCore.sol";
import "./interface/INodeRegistry.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";
import "../utils/@opengsn/contracts/src/BaseRelayRecipient.sol";


contract Bridge is BridgeCore, BaseRelayRecipient  {

  constructor (address listNode, address forwarder) {
        _listNode = listNode;
        trustedForwarder = forwarder;

    }

    modifier onlyTrustedNode() {
        require(INodeRegistry(_listNode).checkPermissionTrustList(_msgSender()) == true, "Only trusted node can invoke");
        _;
    }


    modifier onlyTrustedContract(address receiveSide, address oppositeBridge) {
        require(contractBind[bytes32(uint256(uint160(msg.sender)))][bytes32(uint256(uint160(oppositeBridge)))] == bytes32(uint256(uint160(receiveSide))), "UNTRUSTED CONTRACT");
        _;
    }

    modifier onlyTrustedContractBytes32(bytes32 receiveSide, bytes32 oppositeBridge) {
        require(contractBind[bytes32(uint256(uint160(msg.sender)))][oppositeBridge] == receiveSide, "UNTRUSTED CONTRACT");
        _;
    }

    function transmitRequestV2(
        bytes memory _selector,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId,
        bytes32 requestId,
        address sender,
        uint256 nonce
    )
        external
        onlyTrustedContract(receiveSide, oppositeBridge)
        returns(bool)
    {
        verifyAndUpdateNonce(sender, nonce);
        emit OracleRequest("setRequest", address(this), requestId, _selector, receiveSide, oppositeBridge, chainId);
        return true;
    }

    function transmitRequestV2_32(
        bytes memory _selector,
        bytes32 receiveSide,
        bytes32 oppositeBridge,
        uint256 chainId,
        bytes32 requestId,
        address sender,
        uint256 nonce
    )
        external
        onlyTrustedContractBytes32(receiveSide, oppositeBridge)
        returns(bool)
    {
        verifyAndUpdateNonce(sender, nonce);
        emit OracleRequestSolana("setRequest", address(this), requestId, _selector, receiveSide, oppositeBridge, chainId);
        return true;
    }


    function receiveRequestV2(
        bytes32 reqId,
        bytes memory b,
        bytes32 receiveSide,
        bytes32 bridgeFrom
    ) external onlyTrustedNode {

        bytes32 senderSide = contractBind[receiveSide][bridgeFrom];
        (bool success, bytes memory data) = address(bytes20(receiveSide)).call(b);
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'FAILED');
        emit ReceiveRequest(reqId, receiveSide, bridgeFrom, senderSide);
    }

     string public override versionRecipient = "2.2.3";
}
