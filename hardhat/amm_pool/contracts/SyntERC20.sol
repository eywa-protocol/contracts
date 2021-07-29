// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

// Synthesis must be owner of this contract
contract SyntERC20 is  Ownable, ERC20Permit {


    function mint(address account, uint256 amount) onlyOwner external {
        _mint(account, amount);
    }

    function mintWithAllowance(address account, address spender, uint256 amount) onlyOwner external {
        _mint(account, amount);
        _approve(account, spender, allowance(account, spender) + amount);
    }

    function burn(address account, uint256 amount) onlyOwner external {
        _burn(account, amount);
    }

    function burnWithAllowanceDecrease(address account, address spender, uint256 amount) onlyOwner external {
        uint256 currentAllowance = allowance(account, spender);
        require(currentAllowance >= amount, "ERC20: decreased allowance below zero");
        _approve(account, spender, currentAllowance - amount);
        _burn(account, amount);
    }

    constructor (string memory name_, string memory symbol_) ERC20Permit("SymbiosisGSN") ERC20(name_,symbol_)  {}

}
