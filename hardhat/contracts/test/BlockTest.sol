// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../utils/Block.sol";

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

    function blockHeaderRawDataTest(bytes calldata _data) public pure returns (bytes32 allBlockHash, bytes32 blockTxHash) {
        allBlockHash = sha256(abi.encodePacked(_data));
        blockTxHash = Block.transactionsRoot(_data);
    }
}
