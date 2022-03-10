// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

contract BlockTest {
    function blockHash(
        uint64 chainId,
        bytes32 prevBlockHash,
        bytes32 epochBlockHash,
        bytes32 transactionsRoot,
        uint64 sourceHeigh,
        uint64 height
    ) public pure returns(bytes32) {
        return sha256(abi.encodePacked(
            chainId, prevBlockHash, epochBlockHash, transactionsRoot, sourceHeigh, height
        ));
    }

    function oracleRequestTest(
        address bridge,
        bytes32 requestId,
        bytes calldata selector,
        address receiveSide
    ) public pure returns(bytes32) {
        return sha256(abi.encodePacked(
            bridge, requestId, selector, receiveSide
        ));
    }

    function oracleRequestTestSolana(
        address bridge,
        bytes32 requestId,
        bytes calldata selector,
        bytes32 oppositeBridge
    ) public pure returns(bytes32) {
        return sha256(abi.encodePacked(
            bridge, requestId, selector, oppositeBridge
        ));
    }
}
