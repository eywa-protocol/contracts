// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <=0.8.0;

import "./core/BridgeCore.sol";
import "./interface/INodeRegistry.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";

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

    modifier onlyTrustedDex() {
        require(dexBind[msg.sender] == true, "UNTRUSTED DEX");
        _;
    }

    function transmitRequestV2(
        bytes memory _selector,
        address receiveSide,
        address oppositeBridge,
        uint chainId
    )
        public
        onlyTrustedDex
        returns (bytes32)
    {
        bytes32 requestId = prepareRqId(_selector, receiveSide, oppositeBridge, chainId);

        emit OracleRequest("setRequest", address(this), requestId, _selector, receiveSide, oppositeBridge, chainId);

        return requestId;
    }

    function receiveRequestV2(
        bytes32 reqId,
        bytes memory b,
        address receiveSide,
        address bridgeFrom
    ) external onlyTrustedNode {

        // TODO check and repair this function
        // bytes32 recreateReqId = keccak256(abi.encodePacked(bridgeFrom, nonce[bridgeFrom], b, receiveSide, this, block.chainId));
        // require(reqId == recreateReqId, 'CONSISTENCY FAILED');
        require(dexBind[receiveSide] == true, 'UNTRUSTED DEX');

        (bool success, bytes memory data) = receiveSide.call(b);
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'FAILED');

        nonce[bridgeFrom] = nonce[bridgeFrom] + 1;

//        emit ReceiveRequest(reqId, receiveSide, recreateReqId);
        emit ReceiveRequest(reqId, receiveSide, reqId);
    }
}
