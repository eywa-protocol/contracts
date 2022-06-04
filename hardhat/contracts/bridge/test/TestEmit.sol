// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../core/BridgeCore.sol";

contract TestEmit is BridgeCore {
    function testOracleRequest() public {
        bytes32 requestId = keccak256("");
        address bridge = address(this);
        bytes memory selector;
        uint256 chain = 0xCAFEBABE;
        emit OracleRequest("setRequest", bridge, requestId, selector, bridge, bridge, chain);
    }

    function testReceiveRequest() public {
        bytes32 requestId = keccak256("");
        address bridge = address(this);
        bytes32 bridgeFrom;
        emit ReceiveRequest(requestId, bridge, bridgeFrom);
    }
}
