// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/access/Ownable.sol";
import "@openzeppelin/contracts-newone/utils/Context.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

import "../utils/@opengsn/contracts/src/BaseRelayRecipient.sol";

abstract contract RelayRecipientUpgradable is OwnableUpgradeable, BaseRelayRecipient {
    function _msgSender() internal override(BaseRelayRecipient, ContextUpgradeable) virtual view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData() internal override(BaseRelayRecipient, ContextUpgradeable) virtual view returns (bytes calldata) {
        return BaseRelayRecipient._msgData();
    }
}

abstract contract RelayRecipient is Ownable, BaseRelayRecipient {
    function _msgSender() internal override(BaseRelayRecipient, Context) virtual view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData() internal override(BaseRelayRecipient, Context) virtual view returns (bytes calldata) {
        return BaseRelayRecipient._msgData();
    }
}

