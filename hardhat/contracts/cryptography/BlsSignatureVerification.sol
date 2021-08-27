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
pragma solidity >=0.7.1;

/**
 * Verify BLS Threshold Signed values.
 *
 * Much of the code in this file is derived from here:
 * https://github.com/kfichter/solidity-bls/blob/master/contracts/BLS.sol
 */
contract BlsSignatureVerification {
    uint8 constant private MAX_ATTEMPTS_AT_HASH_TO_CURVE = 10;

    struct E1Point {
        uint x;
        uint y;
    }

    // Note that the ordering of the elements in each array needs to be the reverse of what you would
    // normally have, to match the ordering expected by the precompile.
    struct E2Point {
        uint[2] x;
        uint[2] y;
    }

    function verifySignature(
        bytes calldata _publicKey, // an E2 point
        bytes calldata _message,
        bytes calldata _signature   // an E1 point
    ) external view returns (bool) {
        E2Point memory pub = decodePublicKey(_publicKey);
        E1Point memory sig = decodeSignature(_signature);
        return verify(pub, _message, sig);
    }

    function verifySignatureBytes(
        bytes calldata _data
    ) external view returns (bool) {
        return verifyData(_data);
    }


    /**
     * Checks if a BLS signature is valid.
     *
     * @param _publicKey Public verification key associated with the secret key that signed the message.
     * @param _message Message that was signed.
     * @param _signature Signature over the message.
     * @return True if the message was correctly signed.
     */
    function verify(
        E2Point memory _publicKey,
        bytes memory _message,
        E1Point memory _signature
    ) internal view returns (bool) {
        E1Point[] memory e1points = new E1Point[](2);
        E2Point[] memory e2points = new E2Point[](2);
        e1points[0] = negate(_signature);
        e1points[1] = hashToCurveE1(_message);
        e2points[0] = G2();
        e2points[1] = _publicKey;
        return pairing(e1points, e2points);
    }

    function verifyData(bytes memory _input) internal view returns (bool){
        uint out;
        bool success;
        assembly {
            success := staticcall(not(0), 8, add(_input, 0x20), mul(12, 0x20), out, 0x20)
        }
        require(success, "Pairing operation failed.");
        require(
            out != 0,
            "bn256Pairing call result must be 1"
        );
        return true;
    }


    /**
     * @return The generator of E1.
     */
    function G1() private pure returns (E1Point memory) {
        return E1Point(1, 2);
    }

    /**
     * @return The generator of E2.
     */
    function G2() private pure returns (E2Point memory) {
        return E2Point({
            x: [
                11559732032986387107991004021392285783925812861821192530917403151452391805634,
                10857046999023057135944570762232829481370756359578518086990519993285655852781
            ],
            y: [
                 4082367875863433681332203403145435568316851327593401208105741076214120093531,
                 8495653923123431417604973247489272438418190587263600148770280649306958101930
            ]
          });
    }


    /**
     * Create a point on E1 based on some data.
     *
     * @param _data Value to derive a point from.
     * @return a point on the E1 curve.
     */
    function hashToCurveE1(bytes memory _data) private view returns (E1Point memory) {
        uint256 digest = uint256(keccak256(_data));

        uint8 ctr = 0;
        E1Point memory p;
        while (true) {
            uint256 x = digest + ctr;
            // Don't worry about making the value mod q. This will be done as part of the scalar multiply.

            // Scalar multiply value by base point.
            p = curveMul(G1(), x); // map to point

            // if map is valid, we are done
            if (!isAtInfinity(p)) {
                break;
            }

            // bump counter for next round, if necessary
            ctr++;
            require(ctr < MAX_ATTEMPTS_AT_HASH_TO_CURVE, "Failed to map to point");
        }
        return (p);
    }

    /**
     * Negate a point: Assuming the point isn't at infinity, the negatation is same x value with -y.
     *
     * @dev Negates a point in E1.
     * @param _point Point to negate.
     * @return The negated point.
     */
    function negate(E1Point memory _point) private pure returns (E1Point memory) {
        // Field Modulus.
        uint q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (isAtInfinity(_point)) {
            return E1Point(0, 0);
        }
        return E1Point(_point.x, q - (_point.y % q));
    }

    /**
     * Computes the pairing check e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
     *
     * @param _e1points List of points in E1.
     * @param _e2points List of points in E2.
     * @return True if pairing check succeeds.
     */
    function pairing(E1Point[] memory _e1points, E2Point[] memory _e2points) private view returns (bool) {
        require(_e1points.length == _e2points.length, "Point count mismatch.");

        uint elements = _e1points.length;
        uint inputSize = elements * 6;
        uint[] memory input = new uint[](inputSize);

        for (uint i = 0; i < elements; i++) {
            input[i * 6 + 0] = _e1points[i].x;
            input[i * 6 + 1] = _e1points[i].y;
            input[i * 6 + 2] = _e2points[i].x[0];
            input[i * 6 + 3] = _e2points[i].x[1];
            input[i * 6 + 4] = _e2points[i].y[0];
            input[i * 6 + 5] = _e2points[i].y[1];
        }

        uint[1] memory out;
        bool success;
//        return verifyData(input, inputSize);

        assembly {
            success := staticcall(not(0), 8, add(input, 0x20), mul(12, 0x20), out, 0x20)
        }
        require(success, "Pairing operation failed.");
        require(
            out[0] != 0,
            "bn256Pairing call result must be 1"
        );


        return true;

    }


    function pairingBytes(E1Point[] memory _e1points, E2Point[] memory _e2points) private view returns (uint[] memory input ) {
        require(_e1points.length == _e2points.length, "Point count mismatch.");

        uint elements = _e1points.length;
        uint inputSize = elements * 6;
        uint[] memory input = new uint[](inputSize);

        for (uint i = 0; i < elements; i++) {
            input[i * 6 + 0] = _e1points[i].x;
            input[i * 6 + 1] = _e1points[i].y;
            input[i * 6 + 2] = _e2points[i].x[0];
            input[i * 6 + 3] = _e2points[i].x[1];
            input[i * 6 + 4] = _e2points[i].y[0];
            input[i * 6 + 5] = _e2points[i].y[1];
        }
        return input;
    }


    /**
     * Multiplies a point in E1 by a scalar.
     * @param _point E1 point to multiply.
     * @param _scalar Scalar to multiply.
     * @return The resulting E1 point.
     */
    function curveMul(E1Point memory _point, uint _scalar) private view returns (E1Point memory) {
        uint[3] memory input;
        input[0] = _point.x;
        input[1] = _point.y;
        input[2] = _scalar;

        bool success;
        E1Point memory result;
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x60, result, 0x40)
        }
        require(success, "Point multiplication failed.");
        return result;
    }


    function curveE2Mul(E2Point memory _point, uint _scalar) private view returns (E2Point memory) {
        uint[3] memory input;

        input[0] = _point.x[0];
//        input[1] = _point.x[1];
        input[1] = _point.y[0];
//        input[3] = _point.y[1];
        input[2] = _scalar;

        bool success;
        E2Point memory result;
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x60, result, 0x40)
        }
        require(success, "E2Point multiplication failed.");
        return result;
    }

    /**
     * Check to see if the point is the point at infinity.
     *
     * @param _point a point on E1.
     * @return true if the point is the point at infinity.
     */
    function isAtInfinity(E1Point memory _point) private pure returns (bool){
        return (_point.x == 0 && _point.y == 0);
    }




    /*
     * Multiply the curve generator by a scalar
    **/
    function scalarBaseMult(uint256 x) internal view returns (E1Point memory  r) {
        return curveMul(G1(), x);
    }

    function scalarBaseMultE2(uint256 x) internal view returns (E2Point memory  r) {
        return curveE2Mul(G2(), x);
    }

    function verifyData(uint[] memory _input, uint inputSize) internal view returns (bool){
        bytes memory b = abi.encodePacked(_input);
        return verifyData(b);
    }




    function toBytes(uint x) public returns (bytes memory b) {
        b = new bytes(32);
        assembly { mstore(add(b, 32), x) }
    }



    function decodeSignature(bytes memory _sig) private pure returns (E1Point memory signature) {
        uint256[] memory output = new uint256[](2);
        for (uint256 i = 32; i <= output.length * 32; i += 32) {
            assembly {mstore(add(output, i), mload(add(_sig, i)))}
        }

        signature = E1Point(0, 0);
        signature.x = output[0];
        signature.y = output[1];
    }

    function decodePublicKey(bytes memory _pubKey) private pure returns (E2Point memory pubKey) {
        uint256[] memory output = new uint256[](4);
        for (uint256 i = 32; i <= output.length * 32; i += 32) {
            assembly {mstore(add(output, i), mload(add(_pubKey, i)))}
        }

        pubKey.x[0] = output[0];
        pubKey.x[1] = output[1];
        pubKey.y[0] = output[2];
        pubKey.y[1] = output[3];
    }

    function verifyDebug(
        E2Point memory _publicKey,
        bytes memory _message,
        E1Point memory _signature
    ) internal view returns (E1Point[] memory, E2Point[] memory) {
        E1Point[] memory e1points = new E1Point[](2);
        E2Point[] memory e2points = new E2Point[](2);
        e1points[0] = negate(_signature);
        e1points[1] = hashToCurveE1(_message);
        e2points[0] = G2();
        e2points[1] = _publicKey;
        return (e1points, e2points);
    }


    function verifyingBytes(
        E2Point memory _publicKey,
        bytes memory _message,
        E1Point memory _signature
    ) internal view returns (uint[] memory) {
        E1Point[] memory e1points = new E1Point[](2);
        E2Point[] memory e2points = new E2Point[](2);
        e1points[0] = negate(_signature);
        e1points[1] = hashToCurveE1(_message);
        e2points[0] = G2();
        e2points[1] = _publicKey;
        return pairingBytes(e1points, e2points);
    }



}
