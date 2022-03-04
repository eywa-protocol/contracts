// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@uniswap/lib/contracts/libraries/TransferHelper.sol";

contract Treasury {
    mapping(address => uint256) public balanceOf; //баланс токена

    function depositWithPermit(
        bytes calldata _approvalData,
        address _token,
        uint256 _amount
    ) external {
        (bool _success1, ) = _token.call(_approvalData);
        require(_success1, "Approve call failed");

        TransferHelper.safeTransferFrom(_token, msg.sender, address(this), _amount);
        balanceOf[_token] += _amount;
    }

    function deposit(
        address _token,
        uint256 _amount
    ) external {
        TransferHelper.safeTransferFrom(_token, msg.sender, address(this), _amount);
        balanceOf[_token] += _amount;
    }
}
