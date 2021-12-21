// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./bls/BlsSignatureVerification.sol";
import "./core/BridgeCore.sol";
import "./interface/INodeRegistry.sol";
import "@openzeppelin/contracts-newone/utils/Address.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";
import "../utils/@opengsn/contracts/src/BaseRelayRecipient.sol";

contract Bridge is BridgeCore, BaseRelayRecipient, BlsSignatureVerification {
    using Address for address;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    string public override versionRecipient = "2.2.3";
    E2Point private epochKey;          // Aggregated public key of all paricipants of the current epoch
    address public dao;                // Address of the DAO
    uint8 public epochParticipantsNum; // Number of participants contributed to the epochKey
    uint32 public epochNum;            // Sequential number of the epoch

    event NewEpoch(bytes oldEpochKey, bytes newEpochKey, bool requested, uint32 epochNum);
    event OwnershipTransferred(address indexed previousDao, address indexed newDao);

    constructor(address forwarder) {
        trustedForwarder = forwarder;
    }

    modifier onlyTrustedContract(address receiveSide, address oppositeBridge) {
        require(
            contractBind[castToBytes32(address(_msgSender()))][castToBytes32(oppositeBridge)].contains(
                castToBytes32(receiveSide)
            ),
            "UNTRUSTED CONTRACT"
        );
        _;
    }

    modifier onlyTrustedContractBytes32(bytes32 receiveSide, bytes32 oppositeBridge) {
        require(
            contractBind[castToBytes32(address(_msgSender()))][oppositeBridge].contains(receiveSide),
            "UNTRUSTED CONTRACT"
        );
        _;
    }

    modifier onlyDao() {
        require(_msgSender() == dao, "Only DAO");
        _;
    }

    function getEpoch()
        public
        view
        returns (
            bytes memory,
            uint8,
            uint32
        )
    {
        return (abi.encode(epochKey), epochParticipantsNum, epochNum);
    }

    /**
     * @dev Updates current epoch.
     * @param newKey aggregated public key of all new epoch participants
     * @param votersPubKey aggregated public key of the old epoch participants, who voted for the update
     * @param votersSignature aggregated signature of the old epoch participants, who voted for the update
     * @param votersMask bitmask of old epoch participants, who voted, amoung all participants
     * @param newEpochParticipantsNum number of the participants
     */
    function updateEpoch(
        bytes calldata newKey,
        bytes calldata votersPubKey,
        bytes calldata votersSignature,
        uint256 votersMask,
        uint8 newEpochParticipantsNum,
        uint32 newEpochNum
    ) external {
        require(epochNum + 1 == newEpochNum, "wrong epoch number");

        E2Point memory _newKey = decodeE2Point(newKey);
        E2Point memory _votersPubKey = decodeE2Point(votersPubKey);
        E1Point memory _votersSignature = decodeE1Point(votersSignature);

        if (epochKey.x[0] != 0 || epochKey.x[1] != 0) {
            require(popcnt(votersMask) >= (uint256(epochParticipantsNum) * 2) / 3, "not enough participants"); // TODO configure
            require(epochParticipantsNum == 256 || votersMask < (1 << epochParticipantsNum), "bitmask too big");
            bytes memory data = abi.encodePacked(_newKey.x, _newKey.y, newEpochParticipantsNum, newEpochNum);
            require(verifyMultisig(epochKey, _votersPubKey, data, _votersSignature, votersMask), "multisig mismatch");
        }

        emit NewEpoch(abi.encode(epochKey), abi.encode(_newKey), false, newEpochNum);
        epochKey = _newKey;
        epochParticipantsNum = newEpochParticipantsNum; // TODO: require minimum
        epochNum = newEpochNum;
    }

    /**
     * @dev Transmit crosschain request v2.
     * @param callData call data for opposite side
     * @param receiveSide contract address for call data execution
     * @param oppositeBridge opposite bridge address
     * @param chainId opposite chain ID
     * @param requestId request ID
     * @param sender sender's address
     * @param nonce sender's nonce
     */
    function transmitRequestV2(
        bytes memory callData,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId,
        bytes32 requestId,
        address sender,
        uint256 nonce
    ) external onlyTrustedContract(receiveSide, oppositeBridge) returns (bool) {
        verifyAndUpdateNonce(sender, nonce);
        emit OracleRequest("setRequest", address(this), requestId, callData, receiveSide, oppositeBridge, chainId);
        return true;
    }

    /**
     * @dev Transmit crosschain request v2 with bytes32 to Solana.
     * @param callData call data for opposite side
     * @param receiveSide contract address for call data execution
     * @param oppositeBridge opposite bridge address
     * @param chainId opposite chain ID
     * @param requestId request ID
     * @param sender sender's address
     * @param nonce sender's nonce
     */
    function transmitRequestV2_solana(
        bytes memory callData,
        bytes32 receiveSide,
        bytes32 oppositeBridge,
        uint256 chainId,
        bytes32 requestId,
        address sender,
        uint256 nonce
    ) external onlyTrustedContractBytes32(receiveSide, oppositeBridge) returns (bool) {
        verifyAndUpdateNonce(sender, nonce);
        emit OracleRequestSolana(
            "setRequest",
            castToBytes32(address(this)),
            requestId,
            callData,
            receiveSide,
            oppositeBridge,
            chainId
        );
        return true;
    }

    /**
     * @dev Receive crosschain request v2.
     * @param reqId request ID
     * @param callData function callData
     * @param receiveSide contract address for call data execution
     * @param bridgeFrom opposite bridge address
     * @param votersPubKey aggregated public key of the old epoch participants, who voted for the update
     * @param votersSignature aggregated signature of the old epoch participants, who voted for the update
     * @param votersMask bitmask of old epoch participants, who voted, amoung all participants
     */
    function receiveRequestV2(
        bytes32 reqId,
        bytes memory callData,
        address receiveSide,
        bytes32 bridgeFrom,
        bytes calldata votersPubKey,
        bytes calldata votersSignature,
        uint256 votersMask
    ) external {
        require(epochKey.x[0] != 0 || epochKey.x[1] != 0, "epoch not set");
        require(popcnt(votersMask) >= (uint256(epochParticipantsNum) * 2) / 3, "not enough participants"); // TODO configure
        require(epochParticipantsNum == 256 || votersMask < (1 << epochParticipantsNum), "bitmask too big");

        E2Point memory _votersPubKey = decodeE2Point(votersPubKey);
        E1Point memory _votersSignature = decodeE1Point(votersSignature);
        bytes memory sigData = abi.encodePacked(reqId, callData, receiveSide, bridgeFrom, epochNum);
        require(verifyMultisig(epochKey, _votersPubKey, sigData, _votersSignature, votersMask), "multisig mismatch");

        bytes memory data = receiveSide.functionCall(callData, "receiveRequestV2 failed");
        require(data.length == 0 || abi.decode(data, (bool)), "receiveRequestV2: Unable to decode returned data");
        emit ReceiveRequest(reqId, receiveSide, bridgeFrom);
    }

    /**
     * @dev Request updating epoch. Only DAO may call it.
     * @param resetEpoch true to reset the epoch to zero so anyone can set up a new one, without any check,
     *                   false to request the change from the current one, so current participants must
     *                   successfully vote for it
     */
    function daoUpdateEpochRequest(bool resetEpoch) external onlyDao {
        bytes memory epochKeyBytes = abi.encode(epochKey);
        if (resetEpoch) {
            epochNum++;
            E2Point memory zero;
            emit NewEpoch(epochKeyBytes, abi.encode(zero), true, epochNum);
            epochKey = zero;
        } else {
            emit NewEpoch(epochKeyBytes, epochKeyBytes, true, epochNum);
        }
    }

    /**
     * @dev Transfer DAO to another address.
     */
    function daoTransferOwnership(address newDao) external {
        require(dao == address(0) || _msgSender() == dao, "only DAO");
        emit OwnershipTransferred(dao, newDao);
        dao = newDao;
    }

    function decodeE2Point(bytes memory _pubKey) private pure returns (E2Point memory pubKey) {
        uint256[] memory output = new uint256[](4);
        for (uint256 i = 32; i <= output.length * 32; i += 32) {
            assembly {
                mstore(add(output, i), mload(add(_pubKey, i)))
            }
        }

        pubKey.x[0] = output[0];
        pubKey.x[1] = output[1];
        pubKey.y[0] = output[2];
        pubKey.y[1] = output[3];
    }

    function decodeE1Point(bytes memory sig) private pure returns (E1Point memory signature) {
        uint256[] memory output = new uint256[](2);
        for (uint256 i = 32; i <= output.length * 32; i += 32) {
            assembly {
                mstore(add(output, i), mload(add(sig, i)))
            }
        }

        signature.x = output[0];
        signature.y = output[1];
    }

    function popcnt(uint256 mask) private pure returns (uint256 cnt) {
        while (mask != 0) {
            mask = mask & (mask - 1);
            cnt++;
        }
    }
}
