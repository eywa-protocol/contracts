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
        bytes32 bridge,
        bytes32 requestId,
        bytes calldata selector,
        bytes32 oppositeBridge
    ) public pure returns(bytes32) {
        return sha256(abi.encodePacked(
            bridge, requestId, selector, oppositeBridge
        ));
    }

    /*function oracleRequestMerkleVerify(
        uint64 _blockChainId,
        bytes32 _blockPrevBlockHash,
        bytes32 _blockEpochBlockHash,
        bytes32 _blockTransactionsRoot,
        uint64 _blockSourceHeigh,
        uint64 _blockHeight,
        bytes calldata _auditPath,
        address _txBridge,
        bytes32 _txRequestId,
        bytes calldata _txSelector,
        address _txReceiveSide
    ) public pure returns (bool) {
        bytes32 blockHash = sha256(abi.encodePacked(
            _blockChainId, _blockPrevBlockHash, _blockEpochBlockHash, _blockTransactionsRoot, _blockSourceHeigh, _blockHeight
        ));
        return true;
    }*/
}
