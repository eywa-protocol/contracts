// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol";

interface IVesting {
    function availableAfterFirstCliff(uint256 ownedTokens) external view returns (uint256);

    struct CliffData {
        // Relative timestamp first cliff duration
        uint256 cliffDuration1;
        // Claimable number of tokens after first cliff period
        uint256 cliffAmount1;
        // Relative timestamp second cliff duration
        uint256 cliffDuration2;
        // Claimable number of tokens after second cliff period
        uint256 cliffAmount2;
        // Relative timestamp third cliff duration
        uint256 cliffDuration3;
        // Claimable number of tokens after third cliff period
        uint256 cliffAmount3;
    }

    function getCliffs() external view returns (CliffData memory);

    function getStartTime() external view returns (uint256);
}

contract NftVestingProxy {
    constructor(address vesting) {
        _vesting = vesting;
        startTime = IVesting(_vesting).getStartTime();
        IVesting.CliffData memory cliffs = IVesting(_vesting).getCliffs();
        absoluteCliff1Start = startTime + cliffs.cliffDuration1;
    }

    uint256 public startTime;
    uint256 public absoluteCliff1Start;

    struct Allocation {
        uint256 amount;
        bool cliff1Claimed;
    }

    // NFT_ID -> Allocation
    mapping(uint256 => Allocation) public _allocation;

    address public _vesting;
    address public _nft;

    function getAllocation(uint256 id) public view returns (Allocation memory) {
        return _allocation[id];
    }

    function redeemNft(uint256 id) public {
        require(IERC721(_nft).ownerOf(id) == msg.sender, "Only nft owner");

        uint256 thisAllocation = _allocation[id].amount;
        uint256 thisCliff1Amount = IVesting(_vesting).availableAfterFirstCliff(thisAllocation);
        uint256 thisLinearAmount = thisAllocation - thisCliff1Amount;
        bool thisCliff1Claimed = _allocation[id].cliff1Claimed;

        if (absoluteCliff1Start >= block.timestamp) {
            if (thisCliff1Claimed) {
                SafeERC20.safeTransfer(IERC20(_vesting), msg.sender, thisLinearAmount);
            } else {
                _allocation[id].cliff1Claimed = true;
                SafeERC20.safeTransfer(IERC20(_vesting), msg.sender, thisCliff1Amount);
            }
        }
    }
}
