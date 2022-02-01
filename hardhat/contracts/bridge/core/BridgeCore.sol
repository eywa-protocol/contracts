// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


abstract contract BridgeCore {

    address public _listNode;

    mapping(address => uint256) internal nonces;
    mapping(bytes32 => mapping(bytes32 =>  mapping(bytes32 => bool))) internal contractBind;
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
        bytes32 bridge,
        bytes32 requestId,
        bytes selector,
        bytes32 oppositeBridge,
        uint256 chainid
    );

    event ReceiveRequest(bytes32 reqId, address receiveSide, bytes32 bridgeFrom);


    /**
    * @dev Mandatory for all participants who wants to use their own contracts
    * 1. Contract A (chain A) should be binded with Contract B (chain B) only once! It's not allowed to switch Contract A (chain A) to Contract C (chain B).
    * to prevent malicious behaviour.
    * 2. Contract A (chain A) could be binded with several contracts where every contract from another chain.
    * For ex: Contract A (chain A) --> Contract B (chain B) + Contract A (chain A) --> Contract B' (chain B') ... etc
    * @param from padded sender's address
    * @param oppositeBridge padded opposite bridge address
    * @param to padded recipient address
    */
    function addContractBind(
        bytes32 from,
        bytes32 oppositeBridge,
        bytes32 to
    ) external virtual/**  onlyOwner*/  {
        require(to != "", "Bridge: invalid 'to' address");
        require(from != "", "Bridge: invalid 'from' address");
        // TODO
        // to prevent malicious behaviour like switching between older and newer contracts (need to use DAO/Owner for this!)
        contractBind[from][oppositeBridge][to] = true;
    }

    /**
    * @dev Prepares a request ID with the given arguments.
    * @param oppositeBridge padded opposite bridge address
    * @param chainId opposite chain ID
    * @param receiveSide padded receive contract address
    * @param from padded sender's address
    * @param nonce current nonce
    */
    function prepareRqId(
        bytes32 oppositeBridge,
        uint256 chainId,
        bytes32 receiveSide,
        bytes32 from,
        uint256 nonce
    ) public view returns (bytes32) {
        return keccak256(abi.encodePacked(from, nonce, chainId, block.chainid, receiveSide, oppositeBridge));
    }

    /**
    * @dev Get the nonce of the current sender.
    * @param from sender's address
    */
    function getNonce(address from) public view returns (uint256) {
        return nonces[from];
    }

    /**
    * @dev Verifies and updates the sender's nonce.
    * @param from sender's address
    * @param nonce provided sender's nonce
    */
    function verifyAndUpdateNonce(address from, uint256 nonce) internal {
        require(nonces[from]++ == nonce, "Bridge: nonce mismatch");
    }
}
