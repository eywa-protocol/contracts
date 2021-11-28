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

    event NewEpoch(bytes oldEpochKey, bytes newEpochKey);
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

    function updateEpoch(
        bytes calldata _newKey,
        bytes calldata _votersPubKey,
        bytes calldata _votersSignature,
        uint256 _votersMask
    ) external {
        E2Point memory newKey = decodeE2Point(_newKey);
        E2Point memory votersPubKey = decodeE2Point(_votersPubKey);
        E1Point memory votersSignature = decodeE1Point(_votersSignature);

        if (epochKey.x[0] != 0 || epochKey.x[1] != 0) {
            require(popcnt(_votersMask) >= 3, "not enough participants"); // TODO
            bytes memory data = abi.encodePacked(epochKey.x, epochKey.y, newKey.x, newKey.y);
            require(verifyMultisig(epochKey, votersPubKey, data, votersSignature, _votersMask), "multisig mismatch");
        }

        emit NewEpoch(abi.encode(epochKey), abi.encode(newKey));
        epochKey = newKey;
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

    function daoUpdateEpochRequest(bool resetEpoch) external onlyDao {
        if (resetEpoch) {
            E2Point memory zero;
            emit NewEpoch(abi.encode(epochKey), abi.encode(zero));
            epochKey = zero;
        } else {
            emit NewEpochRequested();
        }
    }

    function daoTransferOwnership(address newDao) public {
        require(dao == address(0) || _msgSender() == dao, "only DAO");
        emit OwnershipTransferred(dao, newDao);
        dao = newDao;
    }

    function decodeE2Point(bytes memory _pubKey) private pure returns (E2Point memory pubKey) {
        uint256[] memory output = new uint256[](4);
        for (uint256 i = 32; i <= output.length * 32; i += 32) {
            assembly { mstore(add(output, i), mload(add(_pubKey, i))) }
        }

        pubKey.x[0] = output[0];
        pubKey.x[1] = output[1];
        pubKey.y[0] = output[2];
        pubKey.y[1] = output[3];
    }

    function decodeE1Point(bytes memory _sig) private pure returns (E1Point memory signature) {
        uint256[] memory output = new uint256[](2);
        for (uint256 i = 32; i <= output.length * 32; i += 32) {
            assembly { mstore(add(output, i), mload(add(_sig, i))) }
        }

        signature.x = output[0];
        signature.y = output[1];
    }

    function popcnt(uint256 mask) private pure returns(uint256 cnt) {
        while(mask != 0) {
            mask = mask & (mask - 1);
            cnt++;
        }
    }
}
