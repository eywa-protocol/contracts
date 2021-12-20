// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts-newone/token/ERC20/extensions/draft-ERC20Permit.sol";
import "../utils/@opengsn/contracts/src/BaseRelayRecipient.sol";
import "./RelayerPool.sol";


contract NodeRegistry is BaseRelayRecipient {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    struct Node {
        address owner;     // address of node signer key
        address pool;      // RelayerPool for this node
        string  hostId;    // libp2p host ID
        string  blsPubKey; // BLS public key
        uint256 nodeId;    // absolute sequential number
    }

    // struct NodeInitParams {
    //     uint256 relayerFeeNumerator;
    //     uint256 emissionRateNumerator;
    //     address rewardToken;
    //     address vault;
    // }

    struct Snapshot {
        uint256 snapNum;
        uint256 lastTouchTime;
        string[] blsPubKeys;
        string[] hostIds;
    }


    uint256 constant SnapshotTtl = 10 seconds;
    uint256 constant SnapshotMinTouchTime = 5 seconds;
    uint256 constant SnapshotMaxSize = 50;
    uint256 public constant MIN_COLLATERAL = 1 ether; // TODO discuss

    address public EYWA;
    EnumerableSet.AddressSet nodes;
    mapping(address => Node) public ownedNodes;
    mapping(string => address) public hostIds;
    Snapshot public snapshot;

    event NewSnapshot(uint256 snapNum);
    event CreatedRelayer(
        address indexed owner,
        address relayerPool,
        string hostId,
        string blsPubKey,
        uint256 nodeId
    );

    constructor(
        address _EYWA,
        address _forwarder
    ) {
        require(_EYWA != address(0), Errors.ZERO_ADDRESS);
        require(_forwarder != address(0), Errors.ZERO_ADDRESS);
        EYWA = _EYWA;
        trustedForwarder = _forwarder;
    }

    modifier isNewNode(address _owner) {
        require(
            ownedNodes[_owner].owner == address(0),
            string(abi.encodePacked("node already exists"))
        );
        _;
    }

    modifier existingNode(address _owner) {
        require(
            ownedNodes[_owner].owner != address(0),
            string(abi.encodePacked("node does not exist"))
        );
        _;
    }

    //TODO: check: nodeRegistry[_blsPointAddr] == address(0)
    function addNode(Node memory node) internal isNewNode(node.owner) {
        //require(node.owner != address(0), Errors.ZERO_ADDRESS);
        require(node.owner == _msgSender(), Errors.ZERO_ADDRESS);
        require(bytes(node.hostId).length != 0, Errors.ZERO_ADDRESS);
        node.nodeId = nodes.length();
        hostIds[node.hostId] = node.owner;
        nodes.add(node.owner);
        ownedNodes[node.owner] = node;

        emit CreatedRelayer(node.owner, node.pool, node.hostId, node.blsPubKey, node.nodeId);
    }

    function getNode(address _owner) external view returns (Node memory) {
        return ownedNodes[_owner];
    }

    function getNodes() external view returns (Node[] memory) {
        Node[] memory allNodes = new Node[](nodes.length());
        for (uint256 i = 0; i < nodes.length(); i++) {
            allNodes[i] = ownedNodes[nodes.at(i)];
        }
        return allNodes;
    }

    function getBLSPubKeys() external view returns (string[] memory) {
        string[] memory pubKeys = new string[](nodes.length());
        for (uint256 i = 0; i < nodes.length(); i++) {
            pubKeys[i] = ownedNodes[nodes.at(i)].blsPubKey;
        }
        return pubKeys;
    }


    function nodeExists(address _owner) external view returns (bool) {
        return ownedNodes[_owner].owner != address(0);
    }

    function checkPermissionTrustList(address _owner) external view returns (bool) {
       return ownedNodes[_owner].owner == _owner; // (test only)
    // return ownedNodes[_owner].status == 1;
    }

    function createRelayer(
        Node memory _node,
     // NodeInitParams memory _params,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        RelayerPool relayerPool = new RelayerPool(
            _node.owner,   // node owner
            address(EYWA), // depositToken
            address(EYWA), // rewardToken            (test only)
            100,           // relayerFeeNumerator    (test only)
            4000,          // emissionRateNumerator  (test only)
            _node.owner    // vault                  (test only)
        );
        uint256 nodeBalance = IERC20(EYWA).balanceOf(_msgSender());
        require(nodeBalance >= MIN_COLLATERAL, "insufficient funds");
        IERC20Permit(EYWA).permit(_msgSender(), address(this), nodeBalance, _deadline, _v, _r, _s);
        IERC20(EYWA).safeTransferFrom(_msgSender(), address(relayerPool), nodeBalance);
        _node.pool = address(relayerPool);
        addNode(_node);
    }

    function getSnapshot() external view returns (string[] memory, string[] memory, uint256) {
        return (snapshot.blsPubKeys, snapshot.hostIds, snapshot.snapNum);
    }

    function touchSnapshot() external {
        require(block.timestamp - snapshot.lastTouchTime > SnapshotMinTouchTime, "Just touched");
        require(ownedNodes[_msgSender()].owner == _msgSender(), "Only nodes");
        if (block.timestamp - snapshot.lastTouchTime > SnapshotTtl) {
            uint256 snapNum = snapshot.snapNum + 1;
            delete snapshot;

            uint256[] memory indexes = new uint256[](nodes.length());
            for (uint256 i = 0; i < nodes.length(); i++) {
                indexes[i] = i;
            }

            uint256 rand = uint256(blockhash(block.number-1));  // TODO unsafe
            uint256 len = nodes.length();
            if (len > SnapshotMaxSize) len = SnapshotMaxSize;
            for (uint256 i = 0; i < len; i++) {
                // https://en.wikipedia.org/wiki/Linear_congruential_generator
                unchecked { rand = rand*6364136223846793005 + 1442695040888963407; }   // TODO unsafe
                uint256 j = i + (rand % (nodes.length() - i));
                Node storage n = ownedNodes[nodes.at(indexes[j])];
                snapshot.blsPubKeys.push(n.blsPubKey);
                snapshot.hostIds.push(n.hostId);
                indexes[j] = indexes[i];
            }

            snapshot.snapNum = snapNum;
            emit NewSnapshot(snapNum);
        }
        snapshot.lastTouchTime = block.timestamp;
    }

    string public override versionRecipient = "2.2.3";
}
