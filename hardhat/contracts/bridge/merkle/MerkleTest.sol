pragma solidity ^0.8.0;

import "./libs/common/ZeroCopySource.sol";
import "./libs/utils/Utils.sol";

contract MerkleTest {
    /* @notice                  Verify Poly chain transaction whether exist or not
    *  @param _auditPath        Poly chain merkle proof
    *  @param _root             Poly chain root
    *  @return                  The verified value included in _auditPath
    */
    function merkleProve(bytes memory _auditPath, bytes32 _root) public pure returns (bytes memory) {
        uint256 off = 0;
        bytes memory value;
        (value, off)  = ZeroCopySource.NextVarBytes(_auditPath, off);

        bytes32 hash = Utils.hashLeaf(value);
        uint size = (_auditPath.length - off) / 33;
        bytes32 nodeHash;
        uint8 pos;
        for (uint i = 0; i < size; i++) {
            (pos, off) = ZeroCopySource.NextUint8(_auditPath, off);
            (nodeHash, off) = ZeroCopySource.NextHash(_auditPath, off);
            if (pos == 0x00) {
                hash = Utils.hashChildren(nodeHash, hash);
            } else if (pos == 0x01) {
                hash = Utils.hashChildren(hash, nodeHash);
            } else {
                revert("merkleProve, NextByte for position info failed");
            }
        }
        require(hash == _root, "merkleProve, expect root is not equal actual root");
        return value;
    }
}
