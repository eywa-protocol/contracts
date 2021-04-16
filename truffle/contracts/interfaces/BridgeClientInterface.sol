// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

/**
 * @notice  Bridge Client Interface
 * 
 * @dev This should be implemented every part of pool or other logic instead pool
 */
interface BridgeClientInterface {
	/**
	*  @notice filling commitment about executed tx in another part of pool
	*/
	function setPendingRequestsDone(bytes32 requestId ,bytes32 tx_fromNet2) external;
}