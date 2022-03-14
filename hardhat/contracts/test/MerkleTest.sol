// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../utils/Merkle.sol";
import "../utils/Utils.sol";

contract MerkleTest {
    function merkleProveTest(bytes memory _auditPath, bytes32 _root) public pure returns (bytes memory) {
        return Merkle.prove(_auditPath, _root);
    }

    function blockMerkleProveTest(bytes memory _auditPath, bytes32 _root) public pure returns (address, bytes32, bytes memory, address) {
        bytes memory payload = Merkle.prove(_auditPath, _root);

        uint256 off = 0;
        bytes20 bridgeFrom;
        bytes32 reqId;
        bytes memory sel;
        bytes20 receiveSide;
        (bridgeFrom, off) = ZeroCopySource.NextBytes20(payload, off);
        (reqId, off) = ZeroCopySource.NextHash(payload, off);
        (sel, off) = ZeroCopySource.NextVarBytes(payload, off);
        (receiveSide, off) = ZeroCopySource.NextBytes20(payload, off);

        return (address(bridgeFrom), reqId, sel, address(receiveSide));
    }
}
