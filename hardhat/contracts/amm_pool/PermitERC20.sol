// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/access/Ownable.sol";
import "@openzeppelin/contracts-newone/token/ERC20/extensions/draft-ERC20Permit.sol";

// Synthesis must be owner of this contract
contract PermitERC20 is Ownable, ERC20Permit {

    constructor(string memory name_, string memory symbol_)
        ERC20Permit("SymbiosisGSN")
        ERC20(name_, symbol_) 
    {}

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function mintWithAllowance(address account, address spender, uint256 amount) external onlyOwner {
        _mint(account, amount);
        _approve(account, spender, allowance(account, spender) + amount);
    }

    function burn(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
    }

    function burnWithAllowanceDecrease(address account, address spender, uint256 amount) external onlyOwner {
        uint256 currentAllowance = allowance(account, spender);
        require(currentAllowance >= amount, "ERC20: decreased allowance below zero");

        _approve(account, spender, currentAllowance - amount);
        _burn(account, amount);
    }
}
