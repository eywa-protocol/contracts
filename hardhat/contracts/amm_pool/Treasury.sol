// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;
import "@openzeppelin/contracts-newone/access/Ownable.sol";
import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-newone/security/ReentrancyGuard.sol";

contract EywaTreasury is Ownable, ReentrancyGuard {
    receive() external payable {}

    fallback() external payable {}

    function withdrawToken(
        address token,
        uint256 amount,
        address to
    ) public onlyOwner {
        SafeERC20.safeTransfer(IERC20(token), to, amount);
    }

    function withdrawNative(uint256 msgValue, address to) public payable onlyOwner nonReentrant {
        (bool sent, ) = to.call{ value: msgValue }("");
        require(sent, "Failed to send Ether");
    }
}
