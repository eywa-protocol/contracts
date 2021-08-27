/*
 * Copyright 2020 ConsenSys Software Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
pragma solidity ^0.7.1;
pragma abicoder v2;

import "./BlsSignatureVerification.sol";


contract BlsSignatureTest is BlsSignatureVerification {
    bool public verified;

//    function verifySignature(
//        bytes calldata _publicKey, // an E2 point
//        bytes calldata _message,
//        bytes calldata _signature   // an E1 point
//    ) external view returns (bool) {
//        E2Point memory pub = decodePublicKey(_publicKey);
//        E1Point memory sig = decodeSignature(_signature);
//        return verify(pub, _message, sig);
//    }


//
//
//    function verifySignatureDebug(
//        bytes calldata _publicKey, // an E2 point
//        bytes calldata _message,
//        bytes calldata _signature   // an E1 point
//    ) external view returns (E1Point[] memory, E2Point[] memory) {
//        E2Point memory pub = decodePublicKey(_publicKey);
//        E1Point memory sig = decodeSignature(_signature);
//        return verifyDebug(pub, _message, sig);
//    }

//    function getSignatureBytes(
//        bytes calldata _publicKey, // an E2 point
//        bytes calldata _message,
//        bytes calldata _signature   // an E1 point
//    ) external view returns (uint256[] memory) {
//        E2Point memory pub = decodePublicKey(_publicKey);
//        E1Point memory sig = decodeSignature(_signature);
//        return verifyingBytes(pub, _message, sig);
//    }


//    function checkVerify(bytes memory _input) external view returns (bool){
//        uint[1] memory out;
//        bool success;
//        assembly {
//            success := staticcall(sub(gas(), 2000), 8, add(_input, 0x20), mul(12, 0x20), out, 0x20)
//        }
//        require(success, "Pairing operation failed.");
//        return out[0] != 0;
//    }

//    function messageToPoints(bytes memory _message) public view returns (bool) {
//        //        E1Point memory g = BlsSignatureVerification.generator();
//        //        require(bn256g1.isOnCurve(g));
//        //        E1Point memory one = scalarBaseMult(1);
//        return true;
//
//    }
//
//
//    function checkVerifyView(bytes memory _input) external view returns (bool){
//        return verifyData(_input);
//    }
//
//    function testPublicKey(bytes memory _input) external view returns (E2Point memory pubKey) {
//        return decodePublicKey(_input);
//    }
//
//    function testSignature(bytes memory _input) external view returns (E1Point memory pubKey) {
//        return decodeSignature(_input);
//    }








}

