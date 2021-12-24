// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <=0.8.3;

import "../Bridge.sol";

/**
 * @notice This is for test purpose.
 *
 * @dev Short life cycle
 * @dev POOL_1#sendRequestTest --> {logic bridge} --> POOL_2#setPendingRequestsDone
 */
contract MockDexPool {

        string constant private SET_REQUEST_TYPE = "setRequest";
        uint256 public testData = 0;

        address public bridge;

        event RequestSent(bytes32 reqId);
        event RequestReceived(uint256 data);

        constructor(address _bridge) {
            bridge = _bridge;
        }

        /**
         * @notice send request like second part of pool
         *
         * @dev LIFE CYCLE
         * @dev ${this pool} -> POOL_2
         * @dev ${this func} ->  bridge#transmitRequest -> node -> adpater#receiveRequest -> mockDexPool_2#receiveRequestTest -> bridge#transmitResponse(reqId) -> node -> adpater#receiveResponse -> mockDexPool_1#setPendingRequestsDone
         *
         */
        function sendRequestTestV2(uint256 testData_, address secondPartPool, address oppBridge, uint chainId) external {
                require(secondPartPool != address(0), "BAD ADDRESS");
                // todo some stuff on this part pool
                // ...

                uint256 nonce = Bridge(bridge).getNonce(msg.sender);
                bytes memory out  = abi.encodeWithSelector(bytes4(keccak256(bytes('receiveRequestTest(uint256)'))), testData_);
                bytes32 requestId = Bridge(bridge).prepareRqId( bytes32(uint256(uint160(oppBridge))), chainId,   bytes32(uint256(uint160(secondPartPool))), bytes32(uint256(uint160(msg.sender))) , nonce);
                bool success = Bridge(bridge).transmitRequestV2(out, secondPartPool, oppBridge, chainId, requestId, msg.sender, nonce);

                emit RequestSent(requestId);
        }

        /**
         * @notice receive request on the second part of pool
         *
         * @dev LIFE CYCLE
         * @dev POOL_1 -> ${this pool}
         * @dev mockDexPool_1#sendRequestTest -> bridge#transmitRequest -> node -> adpater#receiveRequest -> ${this func} -> bridge#transmitResponse(reqId) -> node -> adpater#receiveResponse -> mockDexPool_1#setPendingRequestsDone
         */
        function receiveRequestTest(uint256 _testData) public {
            require(msg.sender == bridge, "ONLY CERTAIN BRIDGE");

            testData = _testData;
            emit RequestReceived(_testData);
        }
}
