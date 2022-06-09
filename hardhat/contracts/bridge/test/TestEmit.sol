// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../core/BridgeCore.sol";

contract TestEmit is BridgeCore {
    event TestEvent(bytes32 indexed id, address indexed who, string what, uint256 when);

    function testTestEvent(bytes32 id, string calldata what) public {
        address who = address(this);
        emit TestEvent(id, who, what, block.timestamp);
    }

    function testOracleRequest(bytes32 requestId, bytes memory selector) public {
        address bridge = address(this);
        uint256 chain = 0xCAFEBABE;
        emit OracleRequest("setRequest", bridge, requestId, selector, bridge, bridge, chain);
    }

    function testReceiveRequest(bytes32 requestId, bytes32 bridgeFrom) public {
        address bridge = address(this);
        emit ReceiveRequest(requestId, bridge, bridgeFrom);
    }
}
