// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts-newone/proxy/transparent/ProxyAdmin.sol";

contract TransparentUpgradeableProxyHelper is TransparentUpgradeableProxy {
    constructor(
        address _logic,
        address admin_,
        bytes memory _data
    ) TransparentUpgradeableProxy(_logic, admin_, _data) {}
}

contract ProxyAdminHelper is ProxyAdmin {}
