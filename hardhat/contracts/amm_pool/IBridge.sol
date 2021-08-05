// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBridge {
     function transmitRequestV2(bytes memory owner, address receiveSide, address oppositeBridge, uint chainID) external returns (bytes32);
}
