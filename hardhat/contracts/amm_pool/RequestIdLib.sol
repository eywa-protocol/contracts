// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

library RequestIdLib {
    /**
     * @dev Prepares a request ID with the given arguments.
     * @param oppositeBridge padded opposite bridge address
     * @param chainId opposite chain ID
     * @param receiveSide padded receive contract address
     * @param from padded sender's address
     * @param nonce current nonce
     */
    function prepareRqId(
        bytes32 oppositeBridge,
        uint256 chainId,
        bytes32 receiveSide,
        bytes32 from,
        uint256 nonce
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(from, nonce, chainId, block.chainid, receiveSide, oppositeBridge));
    }
}
