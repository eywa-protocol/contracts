// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../utils/@opengsn/contracts/src/BaseRelayRecipient.sol";

contract TestForward is BaseRelayRecipient {
    uint256 public val = 1;
    address public sender = address(0);
    string public str;


    event FooCalled(address indexed caller, uint256 val);

    constructor(address _forwarder) {
        require(_forwarder != address(0), "ZERO ADDRESS");
        _setTrustedForwarder(_forwarder);
    }

    function foo(uint256 _val, string memory _str) public {
        require(_val != 0, "ZERO VALUE");
        val = _val;
        str = _str;
        sender = _msgSender();

        emit FooCalled(sender, val);
    }

    string public versionRecipient = "Hello world!";
}
