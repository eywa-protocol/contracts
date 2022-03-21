// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../utils/ZeroCopySource.sol";
import "../utils/Utils.sol";

library Block {
    function transactionsRoot(bytes calldata _payload) internal pure returns (bytes32 txRootHash) {
        txRootHash = Utils.bytesToBytes32(_payload[72:104]);
    }

    function oracleRequestTx(bytes memory _payload) internal pure returns (address bridgeFrom, bytes32 reqId, bytes memory sel, address receiveSide) {
        uint256 off = 0;
        (bridgeFrom, off) = ZeroCopySource.NextAddress(_payload, off);
        (reqId, off) = ZeroCopySource.NextHash(_payload, off);
        (sel, off) = ZeroCopySource.NextVarBytes(_payload, off);
        (receiveSide, off) = ZeroCopySource.NextAddress(_payload, off);
    }
}
