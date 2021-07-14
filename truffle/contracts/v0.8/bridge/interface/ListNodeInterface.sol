// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <=0.8.0;

/**
 * @notice  List of registred nodes
 * 
 * @dev This should be implemented every part of bridge.
 */
interface ListNodeInterface {
	/**
	*  @notice Should has prmission for invoke bridge
	*/
	function checkPermissionTrustList(address node) external view returns (bool);
}