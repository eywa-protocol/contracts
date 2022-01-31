// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../utils/@opengsn/contracts/src/BaseRelayRecipient.sol";

contract TestForward is BaseRelayRecipient {
    uint256 public val = 1;
    address public sender = address(0);
    string public str;

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
    }

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

    function testExecute(
        ForwardRequest memory req,
        bytes32 /*domainSeparator*/,
        bytes32 /*requestTypeHash*/,
        bytes memory /*suffixData*/,
        bytes calldata /*sig*/
    ) external payable
    returns (bool success, string memory ret) {
        require(req.data.length > 0, "req.data absent");
        return (true, "returned test value");
    }

    string public override versionRecipient = "Hello world!";
}
