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

    string public _versionRecipient;
    Bls.E2Point private _epochKey; // Aggregated public key of all paricipants of the current epoch
    address public _dao; // Address of the DAO
    uint8 public _epochParticipantsNum; // Number of participants contributed to the epochKey
    uint32 public _epochNum; // Sequential number of the epoch
    ReqIdFilter public _reqIdFilter; // Filteres received request IDs against replay

    event NewEpoch(bytes oldEpochKey, bytes newEpochKey, bool requested, uint32 epochNum);

    //event OwnershipTransferred(address indexed previousDao, address indexed newDao);

    function initialize(address forwarder) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();

        _versionRecipient = "2.2.3";
        _dao = _msgSender();
        _reqIdFilter = new ReqIdFilter();
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
        require(_msgSender() == _dao, "Bridge: only DAO");
        _;
    }

    /**
     * @dev Get current epoch
     */
    function getEpoch()
        public
        view
        returns (
            bytes memory,
            uint8,
            uint32
        )
    {
        return (abi.encode(_epochKey), _epochParticipantsNum, _epochNum);
    }

    /**
     * @dev Updates current epoch.
     * @param blockHeader block header serialization
     * @param txMerkleProve EpochEvent transaction payload and its Merkle audit path
     * @param votersPubKey aggregated public key of the old epoch participants, who voted for the update
     * @param votersSignature aggregated signature of the old epoch participants, who voted for the update
     * @param votersMask bitmask of old epoch participants, who voted, amoung all participants
     */
    function updateEpoch(
        bytes calldata blockHeader,
        bytes calldata txMerkleProve,
        bytes calldata votersPubKey,
        bytes calldata votersSignature,
        uint256 votersMask
    ) external {
        if (_epochKey.x[0] != 0 || _epochKey.x[1] != 0) {
            Block.verify(blockHeader, votersPubKey, votersSignature, votersMask, _epochKey, _epochParticipantsNum);
        }

        bytes memory _payload = Merkle.prove(txMerkleProve, Block.transactionsRoot(blockHeader));
        (uint32 _txNewEpochNum, bytes memory _txNewKey, uint8 _txNewEpochParticipantsNum) = Block.epochRequestTx(_payload);

        require(_epochNum + 1 == _txNewEpochNum, "wrong epoch number");
        Bls.E2Point memory _newKey = Bls.decodeE2Point(_txNewKey);
        _epochKey = _newKey;
        _epochParticipantsNum = _txNewEpochParticipantsNum; // TODO: require minimum
        _epochNum = _txNewEpochNum;
        _reqIdFilter.destroy();
        _reqIdFilter = new ReqIdFilter();
        emit NewEpoch(abi.encode(_epochKey), abi.encode(_newKey), false, _txNewEpochNum);
    }

    /**
     * @dev Transmit crosschain request v2.
     * @param selector call data
     * @param receiveSide receive contract address
     * @param oppositeBridge opposite bridge address
     * @param chainId opposite chain ID
     * @param requestId request ID
     * @param sender sender's address
     * @param nonce sender's nonce
     */
    function transmitRequestV2(
        bytes calldata selector,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId,
        bytes32 requestId,
        address sender,
        uint256 nonce
    ) external onlyTrustedContract(receiveSide, oppositeBridge) returns (bool) {
        verifyAndUpdateNonce(sender, nonce);
        emit OracleRequest("setRequest", address(this), requestId, selector, receiveSide, oppositeBridge, chainId);
        return true;
    }

    /**
     * @dev Transmit crosschain request v2 with bytes32 to Solana.
     * @param selector call data
     * @param receiveSide receive contract address
     * @param oppositeBridge opposite bridge address
     * @param chainId opposite chain ID
     * @param requestId request ID
     * @param sender sender's address
     * @param nonce sender's nonce
     */
    function transmitRequestV2ToSolana(
        bytes calldata selector,
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
            selector,
            oppositeBridge,
            chainId
        );
        return true;
    }

    /**
     * @dev Receive crosschain request v2.
     * @param blockHeader block header serialization
     * @param txMerkleProve OracleRequest transaction payload and its Merkle audit path
     * @param votersPubKey aggregated public key of the old epoch participants, who voted for the block
     * @param votersSignature aggregated signature of the old epoch participants, who voted for the block
     * @param votersMask bitmask of epoch participants, who voted, amoung all participants
     */
    function receiveRequestV2(
        bytes calldata blockHeader,
        bytes calldata txMerkleProve,
        bytes calldata votersPubKey,
        bytes calldata votersSignature,
        uint256 votersMask
    ) external {
        require(_epochKey.x[0] != 0 || _epochKey.x[1] != 0, "epoch not set");

        // Verify the block signature
        Block.verify(blockHeader, votersPubKey, votersSignature, votersMask, _epochKey, _epochParticipantsNum);

        // Verify that the transaction is really in the block
        bytes memory _payload = Merkle.prove(txMerkleProve, Block.transactionsRoot(blockHeader));

        // Make the call
        (bytes32 _reqId, bytes32 _bridgeFrom, address _receiveSide, bytes memory _sel) = Block.oracleRequestTx(_payload);
        require(_reqIdFilter.testAndSet(_reqId) == false, "Already seen");
        bytes memory _data = _receiveSide.functionCall(_sel, "Bridge: receiveRequestV2: failed");
        require(
            _data.length == 0 || abi.decode(_data, (bool)),
            "Bridge: receiveRequestV2: unable to decode returned data"
        );
        emit ReceiveRequest(_reqId, _receiveSide, _bridgeFrom);
    }

    /**
     * @dev Request updating epoch. Only DAO may call it.
     * @param resetEpoch true to reset the epoch to zero so anyone can set up a new one, without any check,
     *                   false to request the change from the current one, so current participants must
     *                   successfully vote for it
     */
    function daoUpdateEpochRequest(bool resetEpoch) public virtual onlyDao {
        bytes memory _epochKeyBytes = abi.encode(_epochKey);
        if (resetEpoch) {
            _epochNum++;
            Bls.E2Point memory _zero;
            emit NewEpoch(_epochKeyBytes, abi.encode(_zero), true, _epochNum);
            _epochKey = _zero;
        }
    }

    /**
     * @dev Transfer DAO to another address.
     */
    function daoTransferOwnership(address newDao) external {
        require(_dao == address(0) || _msgSender() == _dao, "Bridge: only DAO");
        emit OwnershipTransferred(_dao, newDao);
        _dao = newDao;
    }

    /**
     * @dev Sets new trusted forwarder
     * @param forwarder new forwarder address
     */
    function setTrustedForwarder(address forwarder) external onlyOwner {
        return _setTrustedForwarder(forwarder);
    }

    /**
     * @dev Adds new contract bind
     */
    function addContractBind(
        bytes32 from,
        bytes32 oppositeBridge,
        bytes32 to
    ) external override onlyOwner {
        require(to != "", "Bridge: invalid 'to' address");
        require(from != "", "Bridge: invalid 'from' address");
        contractBind[from][oppositeBridge][to] = true;
    }
}
