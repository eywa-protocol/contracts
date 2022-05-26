// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import { EnumerableSet } from "@openzeppelin/contracts-newone/utils/structs/EnumerableSet.sol";
import { SafeERC20Upgradeable, IERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import { ERC20Permit, IERC20Permit } from "@openzeppelin/contracts-newone/token/ERC20/extensions/draft-ERC20Permit.sol";
import { IERC20 } from "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
import "./Bridge.sol";
import "./RelayerPool.sol";

interface IRelayerPoolFactory {
    function create(
        address _owner,
        address _rewardToken,
        address _depositToken,
        uint256 _relayerFeeNumerator,
        uint256 _emissionAnnualRateNumerator,
        address _vault
    ) external returns (RelayerPool);
}

contract NodeRegistry is Bridge {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct Node {
        address owner;   // address of node signer key
        address pool;    // RelayerPool for this node
        string hostId;   // libp2p host ID
        bytes blsPubKey; // BLS public key
        uint256 nodeId;  // absolute sequential number
    }

    struct Snapshot {
        uint256 snapNum;
        bytes[] blsPubKeys;
        string[] hostIds;
    }

    uint256 constant SnapshotMaxSize = 50; // maximum epoch participants num
    uint256 public constant MIN_COLLATERAL = 1 ether; // TODO discuss

    address public EYWA;
    address public poolFactory;
    EnumerableSet.Bytes32Set nodes;
    mapping(bytes32 => Node) public ownedNodes;
    mapping(string => address) public hostIds;
    Snapshot public snapshot;

    event NewSnapshot(uint256 snapNum);
    event CreatedRelayer(address indexed owner, address relayerPool, string hostId, bytes blsPubKey, uint256 nodeId);

    function initialize2(
        address _EYWA,
        address _forwarder,
        address _poolFactory
    ) public initializer {
        require(_EYWA != address(0), Errors.ZERO_ADDRESS);
        // require(_forwarder != address(0), Errors.ZERO_ADDRESS);
        // require(_poolFactory != address(0), Errors.ZERO_ADDRESS);
        poolFactory = _poolFactory;
        EYWA = _EYWA;
        Bridge.initialize(_forwarder);
    }

    modifier isNewNode(bytes32 _blsPubKey) {
        require(ownedNodes[_blsPubKey].owner == address(0), string(abi.encodePacked("NodeRegistry: node already exists")));
        _;
    }

    modifier existingNode(bytes32 _blsPubKey) {
        require(ownedNodes[_blsPubKey].owner != address(0), string(abi.encodePacked("NodeRegistry: node does not exist")));
        _;
    }

    //TODO: check: nodeRegistry[_blsPointAddr] == address(0)
    function addNode(Node memory node) internal isNewNode(keccak256(node.blsPubKey)) {
        //require(node.owner != address(0), Errors.ZERO_ADDRESS);
        require(node.owner == _msgSender(), Errors.ZERO_ADDRESS);
        require(bytes(node.hostId).length != 0, Errors.ZERO_ADDRESS);
        node.nodeId = nodes.length();
        hostIds[node.hostId] = node.owner;
        nodes.add(keccak256(node.blsPubKey));
        ownedNodes[keccak256(node.blsPubKey)] = node;

        emit CreatedRelayer(node.owner, node.pool, node.hostId, node.blsPubKey, node.nodeId);
    }

    function getNode(bytes32 _blsPubKey) external view returns (Node memory) {
        return ownedNodes[_blsPubKey];
    }

    function getNodes() external view returns (Node[] memory) {
        Node[] memory allNodes = new Node[](nodes.length());
        for (uint256 i = 0; i < nodes.length(); i++) {
            allNodes[i] = ownedNodes[nodes.at(i)];
        }
        return allNodes;
    }

    function getBLSPubKeys() external view returns (bytes[] memory) {
        bytes[] memory pubKeys = new bytes[](nodes.length());
        for (uint256 i = 0; i < nodes.length(); i++) {
            pubKeys[i] = ownedNodes[nodes.at(i)].blsPubKey;
        }
        return pubKeys;
    }

    function nodeExists(bytes32 _blsPubKey) external view returns (bool) {
        return ownedNodes[_blsPubKey].owner != address(0);
    }

    function checkPermissionTrustList(bytes32 _blsPubKey) external view returns (bool) {
        return ownedNodes[_blsPubKey].owner != address(0); // (test only)
    }

    function createRelayer(
        Node memory _node,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        RelayerPool relayerPool = IRelayerPoolFactory(poolFactory).create(
            _node.owner,    // node owner
            address(EYWA),  // depositToken
            address(EYWA),  // rewardToken            (test only)
            100,            // relayerFeeNumerator    (test only)
            4000,           // emissionRateNumerator  (test only)
            _node.owner     // vault                  (test only)
        );
        uint256 nodeBalance = IERC20(EYWA).balanceOf(_msgSender());
        require(nodeBalance >= MIN_COLLATERAL, "NodeRegistry: insufficient funds");
        IERC20Permit(EYWA).permit(_msgSender(), address(this), nodeBalance, _deadline, _v, _r, _s);
        IERC20Upgradeable(EYWA).safeTransferFrom(_msgSender(), address(relayerPool), nodeBalance);
        _node.pool = address(relayerPool);
        addNode(_node);
    }

    function getSnapshot()
        external
        view
        returns (
            bytes[] memory,
            string[] memory,
            uint256
        )
    {
        return (snapshot.blsPubKeys, snapshot.hostIds, snapshot.snapNum);
    }

    function daoUpdateEpochRequest(bool resetEpoch) public override {
        Bridge.daoUpdateEpochRequest(resetEpoch);
        if (snapshot.snapNum <= Bridge.epochNum) {
            newSnapshot();
        }
    }

    function newSnapshot() internal {
        delete snapshot;

        uint256[] memory indexes = new uint256[](nodes.length());
        for (uint256 i = 0; i < nodes.length(); i++) {
            indexes[i] = i;
        }

        uint256 rand = uint256(vrf());
        uint256 len = nodes.length();
        if (len > SnapshotMaxSize) len = SnapshotMaxSize;
        for (uint256 i = 0; i < len; i++) {
            // https://en.wikipedia.org/wiki/Linear_congruential_generator
            unchecked {
                rand = rand * 6364136223846793005 + 1442695040888963407;
            } // TODO unsafe
            uint256 j = i + (rand % (nodes.length() - i));
            Node storage n = ownedNodes[nodes.at(indexes[j])];
            snapshot.blsPubKeys.push(n.blsPubKey);
            snapshot.hostIds.push(n.hostId);
            indexes[j] = indexes[i];
        }

        snapshot.snapNum = Bridge.epochNum + 1;
        emit NewSnapshot(snapshot.snapNum);
    }

    function setUtilityToken(address _token) public onlyOwner {
        EYWA = _token;
    }

    function setRelayerPoolFactory(address _poolFactory) public onlyOwner {
        poolFactory = _poolFactory;
    }

    function vrf() public view returns (bytes32 rand) {
        uint[1] memory bn;
        bn[0] = block.number;
        assembly {
            let memPtr := mload(0x40)
            if iszero(staticcall(not(0), 0xff, bn, 0x20, memPtr, 0x20)) {
                invalid()
            }
            rand := mload(memPtr)
        }
    }
}
