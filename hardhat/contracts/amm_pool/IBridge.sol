// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBridge {
     function transmitRequestV2(bytes memory callData, address receiveSide, address oppositeBridge, uint chainID, bytes32 requestId, address sender, uint256 nonce) external returns (bool);
     function transmitRequestV2_solana(bytes memory callData, bytes32 receiveSide, bytes32 oppositeBridge, uint chainID, bytes32 requestId, address sender, uint256 nonce) external returns (bool);
     function prepareRqId(bytes32 oppositeBridge, uint256 chainId, bytes32 receiveSide, bytes32 from, uint256 nonce) external view returns (bytes32);
     function getNonce(address from) external view returns (uint256);
}