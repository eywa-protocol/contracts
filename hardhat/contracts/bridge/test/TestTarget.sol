// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

contract TestTarget {
    uint256 public testUint;
    address public tesAddress;
    bytes public bytesData;
    string public stringData;

    function setTestUint(uint256 _testUint) external returns (uint256) {
        testUint = _testUint;
        return testUint;
    }

    function setTestAddress(address _address) external returns (address) {
        tesAddress = _address;
        return tesAddress;
    }

    function setTestBytes(bytes memory _inputBytes) external {
        bytesData = _inputBytes;
    }

    function setTestString(string calldata _inputString) external {
        stringData = _inputString;
    }
}
