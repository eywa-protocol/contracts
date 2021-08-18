// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-newone/token/ERC20/extensions/draft-IERC20Permit.sol";

contract MyRewards {
    enum RelayerStatus { Online, Offline, Inactive, BlackListed }

    struct Node {
        address owner;
        address nodeWallet;
        address nodeIdAddress;
        string blsPubKey;
        uint64 nodeId;
        uint256 version;
        RelayerStatus status;
    }

    IERC20Permit public token;
    bool public exists = false;

    constructor(IERC20Permit _token) public {
        token = _token;
    }

    function createRelayer(Node memory _node, uint256 _deadline, uint8 _v, bytes32 _r, bytes32 _s) public {
        token.permit(_node.owner, address(this), 100 ether, _deadline, _v, _r, _s);
        exists = true;
    }

    function NodeExists(address id) public view returns(bool) {
        return exists;
    }
}
