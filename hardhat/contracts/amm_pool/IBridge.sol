// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBridge {
     function transmitRequestV2(bytes memory owner, address receiveSide, address oppositeBridge, uint chainID, bytes32 requestId) external returns (bool);
     function prepareRqId(address oppositeBridge, uint256 chainId, address receiveSide, address sender, uint256 nonce) external view returns (bytes32);
}