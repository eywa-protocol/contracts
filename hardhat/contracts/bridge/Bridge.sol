// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./bls/BlsSignatureVerification.sol";
import "./core/BridgeCore.sol";
import "./interface/INodeRegistry.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";
import "../utils/@opengsn/contracts/src/BaseRelayRecipient.sol";

contract Bridge is BridgeCore, BaseRelayRecipient, BlsSignatureVerification {

    string public override versionRecipient = "2.2.3";
    E2Point private epochKey;
    address public dao;

    event NewEpoch(E2Point epochKey);
    event NewEpochRequested();
    event OwnershipTransferred(address indexed previousDao, address indexed newDao);

  constructor (address listNode, address forwarder) {
        _listNode = listNode;
        trustedForwarder = forwarder;

    }

    modifier onlyTrustedNode() {
        require(INodeRegistry(_listNode).checkPermissionTrustList(_msgSender()) == true, "Only trusted node can invoke");
        _;
    }


    modifier onlyTrustedContract(address receiveSide, address oppositeBridge) {
        require(contractBind[bytes32(uint256(uint160(msg.sender)))][bytes32(uint256(uint160(oppositeBridge)))] == bytes32(uint256(uint160(receiveSide))), "UNTRUSTED CONTRACT");
        _;
    }

    modifier onlyTrustedContractBytes32(bytes32 receiveSide, bytes32 oppositeBridge) {
        require(contractBind[bytes32(uint256(uint160(msg.sender)))][oppositeBridge] == receiveSide, "UNTRUSTED CONTRACT");
        _;
    }

    modifier onlyDao() {
        require(_msgSender() == dao, "Only DAO");
        _;
    }

    function updateEpoch(E2Point memory _newKey, E2Point memory _votersPubKey, E1Point memory _votersSignature, uint _votersMask) external {
        if (epochKey.x[0] != 0 || epochKey.x[1] != 0) {
            bytes memory data = abi.encodePacked(epochKey.x, epochKey.y, _newKey.x, _newKey.y);
            require(verifyMultisig(epochKey, _votersPubKey, data, _votersSignature, _votersMask), "multisig mismatch");
        }
        epochKey = _newKey;
        emit NewEpoch(epochKey);
    }
    
    /** 
    * @dev Transmit crosschain request v2.
    * @param _selector call data
    * @param receiveSide receive contract address
    * @param oppositeBridge opposite bridge address
    * @param chainId opposite chain ID 
    * @param requestId request ID
    * @param sender sender's address
    * @param nonce sender's nonce
    */
    function transmitRequestV2(
        bytes memory _selector,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId,
        bytes32 requestId,
        address sender,
        uint256 nonce
    )
        external
        onlyTrustedContract(receiveSide, oppositeBridge)
        returns(bool)
    {
        verifyAndUpdateNonce(sender, nonce);
        emit OracleRequest("setRequest", address(this), requestId, _selector, receiveSide, oppositeBridge, chainId);
        return true;
    }

    /** 
    * @dev Transmit crosschain request v2 with bytes32.
    * @param _selector call data
    * @param receiveSide receive contract address
    * @param oppositeBridge opposite bridge address
    * @param chainId opposite chain ID 
    * @param requestId request ID
    * @param sender sender's address
    * @param nonce sender's nonce
    */
    function transmitRequestV2_32(
        bytes memory _selector,
        bytes32 receiveSide,
        bytes32 oppositeBridge,
        uint256 chainId,
        bytes32 requestId,
        address sender,
        uint256 nonce
    )
        external
        onlyTrustedContractBytes32(receiveSide, oppositeBridge)
        returns(bool)
    {
        verifyAndUpdateNonce(sender, nonce);
        emit OracleRequestSolana("setRequest", address(this), requestId, _selector, receiveSide, oppositeBridge, chainId);
        return true;
    }


    /** 
    * @dev Receive crosschain request v2.
    * @param reqId request ID
    * @param b call data
    * @param receiveSide receiver address
    * @param bridgeFrom opposite bridge address
    */
    function receiveRequestV2(
        bytes32 reqId,
        bytes memory b,
        address receiveSide,
        bytes32 bridgeFrom
    ) external /** onlyTrustedNode */{

        bytes32 senderSide = contractBind[bytes32(uint256(uint160(receiveSide)))][bridgeFrom];
        (bool success, bytes memory data) = address(bytes20(receiveSide)).call(b);
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'FAILED');
        emit ReceiveRequest(reqId, receiveSide, bridgeFrom, senderSide);
    }

    function daoUpdateEpochRequest() external onlyDao {
        emit NewEpochRequested();
    }

    function daoTransferOwnership(address newDao) public {
        require(dao == address(0) || _msgSender() == dao, "only DAO");
        emit OwnershipTransferred(dao, newDao);
        dao = newDao;
    }
}
