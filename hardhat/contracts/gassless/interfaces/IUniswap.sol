// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";

//minimal uniswap we need:
interface IUniswap {
    function WETH() external view returns (address);

    function tokenAddress(uint256 _erc20) external view returns (address);

    function tokenToEthSwapOutput(
        IERC20 _token,
        uint256 ethBought,
        uint256 maxTokens,
        uint256 deadline
    ) external returns (uint256 out);

    function tokenToEthTransferOutput(
        IERC20 _token,
        uint256 ethBought,
        uint256 maxTokens,
        uint256 deadline,
        address payable recipient
    ) external returns (uint256 out);

    function getTokenToEthOutputPrice(uint256 ethBought) external view returns (uint256 out);

    function getTokenToEthInputPrice(uint256 tokensSold) external view returns (uint256 out);

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function getAmountsIn(uint256 amountOut, address[] memory path) external view returns (uint256[] memory amounts);
}
