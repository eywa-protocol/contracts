// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./core/BridgeCore.sol";
import "./interface/INodeRegistry.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";

//TODO: onlyTrustedNode has worse filled data. I.e. In func NodeList#addNode the golang node registers himself
// and this means every node who wants to start up can add himself in onlyTrustedNode list.
contract Bridge is BridgeCore {

    constructor (address listNode) {
        _listNode = listNode;
        _owner    = msg.sender;
    }

    modifier onlyTrustedNode() {
        require(INodeRegistry(_listNode).checkPermissionTrustList(msg.sender) == true, "Only trusted node can invoke");
        _;
    }

    modifier onlyTrustedContract(address receiveSide, address oppositeBridge) {
        require(contractBind[msg.sender][oppositeBridge] == receiveSide, "UNTRUSTED CONTRACT");
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

    function receiveRequestV2(
        bytes32 reqId,
        bytes memory b,
        address receiveSide,
        address bridgeFrom
    ) external onlyTrustedNode {

        address senderSide = contractBind[receiveSide][bridgeFrom];
        (bool success, bytes memory data) = receiveSide.call(b);
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'FAILED');
        emit ReceiveRequest(reqId, receiveSide, bridgeFrom, senderSide);
    }
}
