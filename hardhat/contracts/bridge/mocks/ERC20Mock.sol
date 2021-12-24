// SPDX-License-Identifier: none
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-newone/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract ERC20Mock is ERC20PresetMinterPauser {
     constructor(string memory name, string memory symbol) ERC20PresetMinterPauser(name, symbol) {

    }
}
