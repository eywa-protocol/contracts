// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/utils/Address.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";

import "../amm_pool/RelayRecipient.sol";
import "../utils/Block.sol";
import "../utils/Bls.sol";
import "../utils/Merkle.sol";
import "../utils/ReqIdFilter.sol";
import "../utils/Typecast.sol";
import "./core/BridgeCore.sol";
import "./interface/INodeRegistry.sol";

contract Bridge is BridgeCore, RelayRecipient, Typecast {
    using AddressUpgradeable for address;
    using ReqIdFilter for ReqIdFilter.Data;

    string public versionRecipient;
    Bls.E2Point private epochKey; // Aggregated public key of all paricipants of the current epoch
    address public dao; // Address of the DAO
    uint8 public epochParticipantsNum; // Number of participants contributed to the epochKey
    uint32 public epochNum; // Sequential number of the epoch

    ReqIdFilter.Data private reqIdFilter; // Filteres request ID against repetition

    event NewEpoch(bytes oldEpochKey, bytes newEpochKey, bool requested, uint32 epochNum);

    //event OwnershipTransferred(address indexed previousDao, address indexed newDao);

    function initialize(address forwarder) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();

        versionRecipient = "2.2.3";
        dao = _msgSender();
        _setTrustedForwarder(forwarder);
    }

    modifier onlyTrustedContract(address receiveSide, address oppositeBridge) {
        require(
            contractBind[castToBytes32(address(_msgSender()))][castToBytes32(oppositeBridge)][
                castToBytes32(receiveSide)
            ] == true,
            "Bridge: untrusted contract"
        );
        _;
    }

    modifier onlyTrustedContractBytes32(bytes32 receiveSide, bytes32 oppositeBridge) {
        require(
            contractBind[castToBytes32(address(_msgSender()))][oppositeBridge][receiveSide] == true,
            "Bridge: untrusted contract"
        );
        _;
    }

    modifier onlyDao() {
        require(_msgSender() == dao, "Bridge: only DAO");
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

    function statFilterLen() external view returns (uint256) {
        return reqIdFilter.length();
    }

    /**
     * @dev Updates current epoch.
     * @param _blockHeader block header serialization
     * @param _txMerkleProve EpochEvent transaction payload and its Merkle audit path
     * @param _votersPubKey aggregated public key of the old epoch participants, who voted for the update
     * @param _votersSignature aggregated signature of the old epoch participants, who voted for the update
     * @param _votersMask bitmask of old epoch participants, who voted, amoung all participants
     */
    function updateEpoch(
        bytes calldata _blockHeader,
        bytes calldata _txMerkleProve,
        bytes calldata _votersPubKey,
        bytes calldata _votersSignature,
        uint256 _votersMask
    ) external {
        if (epochKey.x[0] != 0 || epochKey.x[1] != 0) {
            Block.verify(_blockHeader, _votersPubKey, _votersSignature, _votersMask, epochKey, epochParticipantsNum);
        }

        bytes memory payload = Merkle.prove(_txMerkleProve, Block.transactionsRoot(_blockHeader));
        (uint32 txNewEpochNum, bytes memory txNewKey, uint8 txNewEpochParticipantsNum) = Block.epochRequestTx(payload);
        
        require(epochNum + 1 == txNewEpochNum, "wrong epoch number");
        Bls.E2Point memory newKey = Bls.decodeE2Point(txNewKey);
        epochKey = newKey;
        epochParticipantsNum = txNewEpochParticipantsNum; // TODO: require minimum
        epochNum = txNewEpochNum;
        reqIdFilter.clear();
        emit NewEpoch(abi.encode(epochKey), abi.encode(newKey), false, txNewEpochNum);
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
        bytes calldata _selector,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId,
        bytes32 requestId,
        address sender,
        uint256 nonce
    ) external onlyTrustedContract(receiveSide, oppositeBridge) returns (bool) {
        verifyAndUpdateNonce(sender, nonce);
        emit OracleRequest("setRequest", address(this), requestId, _selector, receiveSide, oppositeBridge, chainId);
        return true;
    }

    /**
     * @dev Transmit crosschain request v2 with bytes32 to Solana.
     * @param _selector call data
     * @param receiveSide receive contract address
     * @param oppositeBridge opposite bridge address
     * @param chainId opposite chain ID
     * @param requestId request ID
     * @param sender sender's address
     * @param nonce sender's nonce
     */
    function transmitRequestV2ToSolana(
        bytes calldata _selector,
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
            _selector,
            oppositeBridge,
            chainId
        );
        return true;
    }

    /**
     * @dev Receive crosschain request v2.
     * @param _blockHeader block header serialization
     * @param _txMerkleProve OracleRequest transaction payload and its Merkle audit path
     * @param _votersPubKey aggregated public key of the old epoch participants, who voted for the block
     * @param _votersSignature aggregated signature of the old epoch participants, who voted for the block
     * @param _votersMask bitmask of epoch participants, who voted, amoung all participants
     */
    function receiveRequestV2(
        bytes calldata _blockHeader,
        bytes calldata _txMerkleProve,
        bytes calldata _votersPubKey,
        bytes calldata _votersSignature,
        uint256 _votersMask
    ) external {
        require(epochKey.x[0] != 0 || epochKey.x[1] != 0, "epoch not set");

        // Verify the block signature
        Block.verify(_blockHeader, _votersPubKey, _votersSignature, _votersMask, epochKey, epochParticipantsNum);

        // Verify that the transaction is really in the block
        bytes memory payload = Merkle.prove(_txMerkleProve, Block.transactionsRoot(_blockHeader));

        // Make the call
        (bytes32 reqId, bytes32 bridgeFrom, address receiveSide, bytes memory sel) = Block.oracleRequestTx(payload);
        require(reqIdFilter.testAndSet(reqId) == false, "Already seen");
        bytes memory data = receiveSide.functionCall(sel, "Bridge: receiveRequestV2: failed");
        require(
            data.length == 0 || abi.decode(data, (bool)),
            "Bridge: receiveRequestV2: unable to decode returned data"
        );
        emit ReceiveRequest(reqId, receiveSide, bridgeFrom);
    }
    
    /**
     * @dev Request updating epoch. Only DAO may call it.
     * @param resetEpoch true to reset the epoch to zero so anyone can set up a new one, without any check,
     *                   false to request the change from the current one, so current participants must
     *                   successfully vote for it
     */
    function daoUpdateEpochRequest(bool resetEpoch) public virtual onlyDao {
        bytes memory epochKeyBytes = abi.encode(epochKey);
        if (resetEpoch) {
            epochNum++;
            Bls.E2Point memory zero;
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
        require(dao == address(0) || _msgSender() == dao, "Bridge: only DAO");
        emit OwnershipTransferred(dao, newDao);
        dao = newDao;
    }

    function setTrustedForwarder(address _forwarder) external onlyOwner {
        return _setTrustedForwarder(_forwarder);
    }
}
