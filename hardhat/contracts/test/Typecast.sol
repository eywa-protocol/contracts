// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

// import "hardhat/console.sol";

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

    function signatureTest(uint256 _testData, bytes32 _reqId)
        public pure
        returns (bytes4 signature, bytes memory output)
    {
        // bytes4
        signature = bytes4(keccak256(bytes('receiveRequestTest(uint256,bytes32)')));
        // console.log('signature: %d', signature);

        //bytes memory
        output = abi.encodeWithSelector(signature, _testData, _reqId);
        // console.log('output: %d', output);

        // return output;
    }
}
