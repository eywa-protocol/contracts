pragma solidity  ^0.8.0;
import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";

interface IWETH is IERC20 {
    event Deposit(address indexed dst, uint wad);
    event Withdrawal(address indexed src, uint wad);
    function () external payable;
    function deposit() external payable;
    function withdraw(uint wad) external;
}
