// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts-newone/token/ERC20/extensions/ERC20Burnable.sol";

contract EywaToken is ERC20Permit, ERC20Burnable {
    string public _name = "EYWA-Token";
    string public _symbol = "EYWA";
    uint256 public constant _totalSupply = 1_000_000_000;

    constructor(address initialOwner) ERC20Permit(_name) ERC20(_name, _symbol) {
        _mint(initialOwner, _totalSupply);
    }
}
