//SPDX-License-Identifier: MIT
pragma solidity 0.4.24;

contract Voting {

    /**
    * @notice Create a new vote about "`_metadata`"
    * @param _executionScript EVM script to be executed on approval
    * @param _metadata Vote metadata
    * @return voteId Id for newly created vote
    */
    function newVote(bytes _executionScript, string _metadata) external returns (uint256 voteId) {
        return voteId;
    }

    /**
    * @notice Create a new vote about "`_metadata`"
    * @param _executionScript EVM script to be executed on approval
    * @param _metadata Vote metadata
    * @param _castVote Whether to also cast newly created vote
    * @param _executesIfDecided Whether to also immediately execute newly created vote if decided
    * @return voteId id for newly created vote
    */
    function newVote(bytes _executionScript, string _metadata, bool _castVote, bool _executesIfDecided)
        external
        returns (uint256 voteId)
    {
        return voteId;
    }

    /**
    * @notice Vote a percentage value in favor of a vote
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @param _voteData Packed vote data containing both voteId and the vote in favor percentage (where 0 is no, and 1e18 is yes)
    *          Vote data packing
    * |  yeaPct  |  nayPct  |   voteId  |
    * |  64b     |  64b     |   128b    |
    * @param _supports Whether voter supports the vote (preserved for backward compatibility purposes)
    * @param _executesIfDecided Whether the vote should execute its action if it becomes decided
    */
    function vote(uint256 _voteData, bool _supports, bool _executesIfDecided) external {}

    /**
    * @notice Execute vote #`_voteId`
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @param _voteId Id for vote
    */
    function executeVote(uint256 _voteId) external {}
}