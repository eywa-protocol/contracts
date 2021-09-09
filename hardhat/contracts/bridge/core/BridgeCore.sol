// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

contract BridgeCore {

    address public _listNode;

    /* bridge => nonce */
    mapping(address => mapping(address => uint256)) internal nonce;
    mapping(address => mapping(address => address)) internal contractBind;
    mapping(address => bool) private is_in;

    event OracleRequest(
        string  requestType,
        address bridge,
        bytes32 requestId,
        bytes   selector,
        address receiveSide,
        address oppositeBridge,
        uint chainid
    );

    event ReceiveRequest(bytes32 reqId, address receiveSide, address bridgeFrom, address senderSide);

//    modifier onlyOwner() {
//        require(msg.sender == _msgSender(), "Ownable: caller is not the owner");
//        _;
//    }

    /**
       Mandatory for participants who wants to use a own contracts
       1. Contract A (chain A) should be bind with Contract B (chain B) only once! It's not allowed to  switch Contract A (chain A) to Contract C (chain B). This mandatory
       for prevent malicious behaviour.
       2. Contract A (chain A) could be bind with several contracts where every contract from another chain. For ex: Contract A (chain A) --> Contract B (chain B) + Contract A (chain A) --> Contract B' (chain B') ... etc
    */
    function addContractBind(address from, address oppositeBridge, address to) external {
        require(to   != address(0), "NULL ADDRESS TO");
        require(from != address(0), "NULL ADDRESS FROM");
        require(is_in[to] == false, "TO ALREADY EXIST");
        // for prevent malicious behaviour like switching between older and newer contracts
        require(contractBind[from][oppositeBridge] == address(0), "UPDATE DOES NOT ALLOWED");
        contractBind[from][oppositeBridge] = to;
        is_in[to] = true;

    }

    function prepareRqId(bytes memory  _selector, address oppositeBridge, uint256 chainId, address receiveSide) internal view returns (bytes32) {
        bytes32 requestId = keccak256(abi.encodePacked(nonce[oppositeBridge][receiveSide], _selector, chainId));
        return requestId;
    }
}
