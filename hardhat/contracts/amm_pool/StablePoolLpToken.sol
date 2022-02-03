// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/access/Ownable.sol";
import "@openzeppelin/contracts-newone/token/ERC20/extensions/draft-ERC20Permit.sol";


contract StablePoolLpToken is  Ownable, ERC20Permit {

    constructor (string memory name_, string memory symbol_, uint256 decimals_, uint256 supply_) ERC20Permit("SymbiosisGSN") ERC20(name_,symbol_) {}

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function burnFrom(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
    }

    function set_minter(address newMinter) external onlyOwner {
        transferOwnership(newMinter);
    }
}
