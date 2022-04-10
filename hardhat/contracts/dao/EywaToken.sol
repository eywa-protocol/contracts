// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/access/Ownable.sol";
import "@openzeppelin/contracts-newone/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts-newone/token/ERC20/extensions/ERC20Burnable.sol";


contract EywaToken is ERC20Permit, ERC20Burnable {
    constructor (
        string memory name, 
        string memory symbol,
        address initialOwner,
        uint256 totalEywaAmount
    ) ERC20Permit(name) ERC20(name,symbol) {
        _mint(initialOwner, totalEywaAmount);
    }
}
