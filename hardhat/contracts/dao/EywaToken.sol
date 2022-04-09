// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-newone/security/ReentrancyGuard.sol";

import "@openzeppelin/contracts-newone/access/Ownable.sol";
import "@openzeppelin/contracts-newone/token/ERC20/extensions/draft-ERC20Permit.sol";

contract PermitERC20 is ERC20Permit {
    constructor (
        string memory name_, 
        string memory symbol_,
        uint256 totalEywa,
        uint256 initialOwner
    ) ERC20Permit(name_) ERC20(name_,symbol_) {
        _mint(initialOwner, amount);
    }
    
}
