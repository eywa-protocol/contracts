// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import { IERC20 } from "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol";

// todo discuss how real Vault should work like
/// @notice Allows any token to any spender
contract VaultMock {
    using SafeERC20 for IERC20;

    function approveInfinity(address token, address user) external {
        IERC20(token).safeApprove(user, type(uint256).max);
    }
}
