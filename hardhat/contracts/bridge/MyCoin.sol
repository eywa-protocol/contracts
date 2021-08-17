// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-newone/token/ERC20/extensions/draft-ERC20Permit.sol";

contract MyCoin is ERC20Permit {
    string constant private _name = "MyEYWA";
    
    constructor() ERC20Permit(_name) ERC20(_name, _name) {}
}

