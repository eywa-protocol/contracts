// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "../interfaces/IERC20.sol";

interface IVesting {
    function availableAfterFirstCliff(uint256 ownedTokens) external view returns (uint256);
}

contract NftVestingProxy {
    constructor(address vesting) {
        _vesting = vesting;
    }

    struct Allocation {
        address user;
        uint256 amount;
        bool claimed;
    }

    // NFT_ID -> Allocation
    mapping(uint256 => Allocation) public _allocation;

    address public _vesting;
    address public _nft;

    function getAllocation(uint256 id) public returns (Allocation memory) {
        return _allocation[id];
    }

    function redeemNft(uint256 id) public {
        require(IERC721(_nft).ownerOf(id) == msg.sender, "Only nft owner");
        IVesting(_vesting).availableAfterFirstCliff(_allocation[id].amount);
        IERC20(eywaToken).safeTransfer(msg.sender, _allocation[id].amount);
    }
}
