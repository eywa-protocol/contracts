// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../utils/Merkle.sol";
import "../utils/Block.sol";

contract MerkleTest {
    function merkleProveTest(bytes memory _auditPath, bytes32 _root) public pure returns (bytes memory) {
        return Merkle.prove(_auditPath, _root);
    }

    function blockMerkleProveTest(
        bytes memory _auditPath,
        bytes32 _root
    ) public pure returns (
        address bridgeFrom,
        bytes32 reqId,
        bytes memory sel,
        address receiveSide
    ) {
        bytes memory payload = Merkle.prove(_auditPath, _root);
        return Block.oracleRequestTx(payload);
    }
}
