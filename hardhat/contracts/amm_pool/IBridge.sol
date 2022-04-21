// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IBridge {
     function transmitRequestV2(bytes memory owner, address receiveSide, address oppositeBridge, uint chainId, bytes32 requestId, address sender, uint256 nonce) external returns (bool);
     function transmitRequestV2ToSolana(bytes memory owner, bytes32 receiveSide, bytes32 oppositeBridge, uint chainId, bytes32 requestId, address sender, uint256 nonce) external returns (bool);
     function getNonce(address from) external view returns (uint256);
}
