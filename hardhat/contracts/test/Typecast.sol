// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

contract Typecast {


    function castToAddress(bytes32 x) public pure returns (address) {
        return address(uint160(uint256(x)));
    }

    function castToBytes(address a) public pure returns (bytes32) {
        return bytes32(uint256(uint160(a)));
    }

    function castToBytes(bytes32 a) public pure returns (bytes32) {
        return a;
    }
}
