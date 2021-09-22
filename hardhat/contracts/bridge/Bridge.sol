// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./core/BridgeCore.sol";
import "./interface/INodeRegistry.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";
import "../utils/@opengsn/contracts/src/BaseRelayRecipient.sol";

//TODO: onlyTrustedNode has worse filled data. I.e. In func NodeList#addNode the golang node registers himself
// and this means every node who wants to start up can add himself in onlyTrustedNode list.
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
        require(contractBind[_msgSender()][oppositeBridge] == receiveSide, "UNTRUSTED CONTRACT");
        _;
    }

    function transmitRequestV2(
        bytes memory _selector,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId
    )
        external
        onlyTrustedContract(receiveSide, oppositeBridge)
        returns (bytes32){

        bytes32 requestId = prepareRqId(_selector, oppositeBridge, chainId, receiveSide);
        nonce[oppositeBridge][receiveSide] = nonce[oppositeBridge][receiveSide] + 1;
        emit OracleRequest("setRequest", address(this), requestId, _selector, receiveSide, oppositeBridge, chainId);
        return requestId;
    }

    function receiveRequestV2(
        bytes32 reqId,
        bytes memory b,
        address receiveSide,
        address bridgeFrom
    ) external onlyTrustedNode {

        address senderSide = contractBind[receiveSide][bridgeFrom];
        bytes32 recreateReqId = keccak256(abi.encodePacked(nonce[bridgeFrom][senderSide], b, block.chainid));
        require(reqId == recreateReqId, 'CONSISTENCY FAILED');
        (bool success, bytes memory data) = receiveSide.call(b);
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'FAILED');
        nonce[bridgeFrom][senderSide] = nonce[bridgeFrom][senderSide] + 1;

        emit ReceiveRequest(reqId, receiveSide, bridgeFrom, senderSide);
    }

    string public override versionRecipient = "2.2.3";

}
