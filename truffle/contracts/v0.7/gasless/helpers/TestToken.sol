// SPDX-License-Identifier:MIT
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {

    constructor (string memory  n1, string memory  n2) ERC20(n1,n2)  {
	_mint(msg.sender, 100e18);
    }

    function mint(address rec, uint amount) public {
        _mint(rec, amount);
        //_approve(rec, spender[0], amount);
        //_approve(rec, spender[1], amount);
    }
}
