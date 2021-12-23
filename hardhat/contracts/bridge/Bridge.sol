// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./core/BridgeCore.sol";
import "./interface/ListNodeInterface.sol";

//TODO: onlyTrustedNode has worse filled data. I.e. In func NodeList#addNode the golang node registers himself
// and this means every node who wants to start up can add himself in onlyTrustedNode list.
contract Bridge is BridgeCore {
    string public versionRecipient = "2.2.3";

    constructor (address listNode, address forwarder) {
        _listNode = listNode;

        /* hotfix: due error go run wrappers-builder/main.go --json "hardhat/artifacts/contracts/bridge"/Bridge.sol --pkg wrappers --out wrappers
         * FATA[0000] duplicated identifier "_owner"(normalized "Owner"), use --alias for renaming 
         * Should delete in future
         */
        //_owner    = msg.sender; 
        _setTrustedForwarder(forwarder);
    }

    modifier onlyTrustedNode() {
        require(ListNodeInterface(_listNode).checkPermissionTrustList(msg.sender) == true, "Only trusted node can invoke");
        _;
    }

    modifier onlyTrustedContract(address receiveSide, address oppositeBridge) {
        require(contractBind[msg.sender][oppositeBridge] == receiveSide, "UNTRUSTED CONTRACT");
        _;
    }

    function setTrustedForwarder(address _forwarder) external onlyOwner {
       return _setTrustedForwarder(_forwarder);
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
        //TODO refactor check synced crosschain nonces
//        require(reqId == recreateReqId, 'CONSISTENCY FAILED');
        (bool success, bytes memory data) = receiveSide.call(b);
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'FAILED');
        nonce[bridgeFrom][senderSide] = nonce[bridgeFrom][senderSide] + 1;

        emit ReceiveRequest(reqId, receiveSide, bridgeFrom, senderSide);
    }
}
