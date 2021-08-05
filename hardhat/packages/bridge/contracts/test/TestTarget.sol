// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract TestTarget {

    uint public testUint;
    address public tesAddress;
    bytes public bytesData;
    string public stringData;



    function setTestUint(uint _testUint) external returns (uint) {
        testUint = _testUint;
        return testUint;
    }

    function setTestAddress(address _address) external returns (address){
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
