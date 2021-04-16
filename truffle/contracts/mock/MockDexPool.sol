// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "../Bridge.sol";
import "../interfaces/BridgeClientInterface.sol";

/**
 * @notice This is for test purpose.
 *
 * @dev Short life cycle
 * @dev POOL_1#sendRequestTest --> {logic bridge} --> POOL_2#setPendingRequestsDone
 */
contract MockDexPool is BridgeClientInterface {

	event RequestSended(bytes32 reqId);

	string constant private SET_REQUEST_TYPE = "setRequest";
	uint256 public testData = 0;

	address bridge;

	constructor(address _bridge) public {
		bridge = _bridge;
	}

	mapping(bytes32 /** requestId -> tx_from_other_side */ => bytes32) private pendingRequests;



  /**
   * @notice send request like second part of pool
   *
   * @dev LIFE CYCLE
   * @dev ${this pool} -> POOL_2
   * @dev ${this func} ->  bridge#transmitRequest -> node -> adpater#receiveRequest -> mockDexPool_2#receiveRequestTest -> bridge#transmitResponse(reqId) -> node -> adpater#receiveResponse -> mockDexPool_1#setPendingRequestsDone
   *
   */
	function sendRequestTest(uint256 testData, address secondPartPool) external {
		require(secondPartPool != address(0), "BAD ADDRESS");
		// todo some stuff on this part pool
		// ...

		bytes memory out  = abi.encodeWithSelector(bytes4(keccak256(bytes('receiveRequestTest(uint256)'))), testData);
		bytes32 requestId = Bridge(bridge).transmitRequest(SET_REQUEST_TYPE, out, secondPartPool);

		pendingRequests[requestId] = "0x1";

		emit RequestSended(requestId);
	}

	function sendRequestTestV2(uint256 testData, address secondPartPool) external {
		require(secondPartPool != address(0), "BAD ADDRESS");
		// todo some stuff on this part pool
		// ...

		bytes memory out  = abi.encodeWithSelector(bytes4(keccak256(bytes('receiveRequestTest(uint256)'))), testData);
		bytes32 requestId = Bridge(bridge).transmitRequestV2(out, secondPartPool);

		pendingRequests[requestId] = "0x1";

		emit RequestSended(requestId);
	}




 /**
   * @notice receive request on the second part of pool
   *
   * @dev LIFE CYCLE
   * @dev POOL_1 -> ${this pool}
   * @dev mockDexPool_1#sendRequestTest -> bridge#transmitRequest -> node -> adpater#receiveRequest -> ${this func} -> bridge#transmitResponse(reqId) -> node -> adpater#receiveResponse -> mockDexPool_1#setPendingRequestsDone
   *
   */
	function receiveRequestTest(uint256 _testData) public {
   		require(msg.sender == bridge, "ONLY CERTAIN BRIDGE");


     	testData = _testData;

	}


 /**
   * @notice receive response after early sended request
   *
   * @dev for consistent "transaction" between pool_1 and pool_2 we must got approve that transaction TRUE from pool_2
   * @dev LIFE CYCLE
   * @dev ${this pool} -> POOL_2
   * @dev mockDexPool_1#sendRequestTest -> bridge#transmitRequest -> node -> adpater#receiveRequest -> mockDexPool_2#receiveRequestTest -> bridge#transmitResponse(reqId) -> node -> adpater#receiveResponse -> ${this func}
   *
   */
   function setPendingRequestsDone(bytes32 requestId ,bytes32 tx_fromNet2) public override {
   		require(pendingRequests[requestId] == "0x1", "NOT FOUND SUCH REQUEST");

	 	pendingRequests[requestId] = tx_fromNet2;

	}

	/**
	*  @notice only for test
	*/
	function getPendingRequests(bytes32 requestId) external view returns (bytes32, bytes32) {

		return (requestId, pendingRequests[requestId]);
	}

}
