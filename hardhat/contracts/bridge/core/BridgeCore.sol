// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

contract BridgeCore {
    address public _listNode;

    mapping(address => uint256) internal nonces;
    mapping(bytes32 => mapping(bytes32 => bytes32)) internal contractBind;
    mapping(bytes32 => bool) private is_in;

    event OracleRequest(
        string requestType,
        address bridge,
        bytes32 requestId,
        bytes selector,
        address receiveSide,
        address oppositeBridge,
        uint256 chainid
    );

    event OracleRequestSolana(
        string requestType,
        address bridge,
        bytes32 requestId,
        bytes selector,
        bytes32 receiveSide,
        bytes32 oppositeBridge,
        uint256 chainid
    );
    // event ReceiveRequest(bytes32 reqId, address receiveSide, address bridgeFrom, address senderSide);
    event ReceiveRequest(bytes32 reqId, address receiveSide, bytes32 bridgeFrom, bytes32 senderSide);


    /**
       Mandatory for participants who wants to use their own contracts
       1. Contract A (chain A) should be bind with Contract B (chain B) only once! It's not allowed to  switch Contract A (chain A) to Contract C (chain B). This mandatory
       for prevent malicious behaviour.
       2. Contract A (chain A) could be bind with several contracts where every contract from another chain. For ex: Contract A (chain A) --> Contract B (chain B) + Contract A (chain A) --> Contract B' (chain B') ... etc
    */
    function addContractBind(
        bytes32 from,
        bytes32 oppositeBridge,
        bytes32 to
    ) external {
        require(to != "", "NULL ADDRESS TO");
        require(from != "", "NULL ADDRESS FROM");
        require(is_in[to] == false, "TO ALREADY EXIST");
        // to prevent malicious behaviour like switching between older and newer contracts
        require(contractBind[from][oppositeBridge] == "", "UPDATE DOES NOT ALLOWED");
        contractBind[from][oppositeBridge] = to;
        is_in[to] = true;
    }

    function prepareRqId(
        bytes32 oppositeBridge,
        uint256 chainId,
        bytes32 receiveSide,
        bytes32 from,
        uint256 nonce
    ) public view returns (bytes32) {
        return keccak256(abi.encodePacked(from, nonce, chainId, receiveSide, oppositeBridge));
    }


    function getNonce(address from) public view returns (uint256) {
        return nonces[from];
    }

    function verifyAndUpdateNonce(address from, uint256 nonce) internal {
        require(nonces[from]++ == nonce, "nonce mismatch");
    }
}
