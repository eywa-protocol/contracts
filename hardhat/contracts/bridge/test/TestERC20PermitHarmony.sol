// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../utils/draft-ERC20Permit.sol";

contract TestTokenPermitHarmony is ERC20Permit {
    constructor(string memory name_, string memory symbol_, uint256 chainId_) ERC20Permit("EYWA", chainId_) ERC20(name_, symbol_) {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function mintWithAllowance(
        address account,
        address spender,
        uint256 amount
    ) external {
        _mint(account, amount);
        _approve(account, spender, allowance(account, spender) + amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }

    function burnWithAllowanceDecrease(
        address account,
        address spender,
        uint256 amount
    ) external {
        uint256 currentAllowance = allowance(account, spender);
        require(currentAllowance >= amount, "ERC20: decreased allowance below zero");
        _approve(account, spender, currentAllowance - amount);
        _burn(account, amount);
    }
}
