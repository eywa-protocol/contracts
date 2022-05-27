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

    address public _EYWA;
    address public _poolFactory;
    EnumerableSet.Bytes32Set _nodes;
    mapping(bytes32 => Node) public _ownedNodes;
    mapping(string => address) public _hostIds;
    Snapshot public _snapshot;

    event NewSnapshot(uint256 snapNum);
    event CreatedRelayer(address indexed owner, address relayerPool, string hostId, bytes blsPubKey, uint256 nodeId);

    function initialize2(
        address EYWA,
        address forwarder,
        address poolFactory
    ) public initializer {
        require(EYWA != address(0), Errors.ZERO_ADDRESS);
        // require(_forwarder != address(0), Errors.ZERO_ADDRESS);
        // require(_poolFactory != address(0), Errors.ZERO_ADDRESS);
        _poolFactory = poolFactory;
        _EYWA = EYWA;
        Bridge.initialize(forwarder);
    }

    modifier isNewNode(bytes32 blsPubKey) {
        require(_ownedNodes[blsPubKey].owner == address(0), string(abi.encodePacked("NodeRegistry: node already exists")));
        _;
    }

    modifier existingNode(bytes32 blsPubKey) {
        require(_ownedNodes[blsPubKey].owner != address(0), string(abi.encodePacked("NodeRegistry: node does not exist")));
        _;
    }

    //TODO: check: nodeRegistry[_blsPointAddr] == address(0)
    function addNode(Node memory node) internal isNewNode(keccak256(node.blsPubKey)) {
        //require(node.owner != address(0), Errors.ZERO_ADDRESS);
        require(node.owner == _msgSender(), Errors.ZERO_ADDRESS);
        require(bytes(node.hostId).length != 0, Errors.ZERO_ADDRESS);
        node.nodeId = _nodes.length();
        _hostIds[node.hostId] = node.owner;
        _nodes.add(keccak256(node.blsPubKey));
        _ownedNodes[keccak256(node.blsPubKey)] = node;

        emit CreatedRelayer(node.owner, node.pool, node.hostId, node.blsPubKey, node.nodeId);
    }

    function getNode(bytes32 blsPubKey) external view returns (Node memory) {
        return _ownedNodes[blsPubKey];
    }

    function getNodes() external view returns (Node[] memory) {
        Node[] memory allNodes = new Node[](_nodes.length());
        for (uint256 i = 0; i < _nodes.length(); i++) {
            allNodes[i] = _ownedNodes[_nodes.at(i)];
        }
        return allNodes;
    }

    function getBLSPubKeys() external view returns (bytes[] memory) {
        bytes[] memory _pubKeys = new bytes[](_nodes.length());
        for (uint256 i = 0; i < _nodes.length(); i++) {
            _pubKeys[i] = _ownedNodes[_nodes.at(i)].blsPubKey;
        }
        return _pubKeys;
    }

    function nodeExists(bytes32 blsPubKey) external view returns (bool) {
        return _ownedNodes[blsPubKey].owner != address(0);
    }

    function checkPermissionTrustList(bytes32 blsPubKey) external view returns (bool) {
        return _ownedNodes[blsPubKey].owner != address(0); // (test only)
    }

    function createRelayer(
        Node memory node,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        RelayerPool _relayerPool = IRelayerPoolFactory(_poolFactory).create(
            node.owner,    // node owner
            address(_EYWA),  // depositToken
            address(_EYWA),  // rewardToken            (test only)
            100,            // relayerFeeNumerator    (test only)
            4000,           // emissionRateNumerator  (test only)
            node.owner     // vault                  (test only)
        );
        uint256 _nodeBalance = IERC20(_EYWA).balanceOf(_msgSender());
        require(_nodeBalance >= MIN_COLLATERAL, "NodeRegistry: insufficient funds");
        IERC20Permit(_EYWA).permit(_msgSender(), address(this), _nodeBalance, deadline, v, r, s);
        IERC20Upgradeable(_EYWA).safeTransferFrom(_msgSender(), address(_relayerPool), _nodeBalance);
        node.pool = address(_relayerPool);
        addNode(node);
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
        return (_snapshot.blsPubKeys, _snapshot.hostIds, _snapshot.snapNum);
    }

    function daoUpdateEpochRequest(bool resetEpoch) public override {
        Bridge.daoUpdateEpochRequest(resetEpoch);
        if (_snapshot.snapNum <= Bridge._epochNum) {
            newSnapshot();
        }
    }

    function newSnapshot() internal {
        delete _snapshot;

        uint256[] memory _indexes = new uint256[](_nodes.length());
        for (uint256 i = 0; i < _nodes.length(); i++) {
            _indexes[i] = i;
        }

        uint256 rand = uint256(vrf());
        uint256 len = _nodes.length();
        if (len > SnapshotMaxSize) len = SnapshotMaxSize;
        for (uint256 i = 0; i < len; i++) {
            // https://en.wikipedia.org/wiki/Linear_congruential_generator
            unchecked {
                rand = rand * 6364136223846793005 + 1442695040888963407;
            } // TODO unsafe
            uint256 j = i + (rand % (_nodes.length() - i));
            Node storage n = _ownedNodes[_nodes.at(_indexes[j])];
            _snapshot.blsPubKeys.push(n.blsPubKey);
            _snapshot.hostIds.push(n.hostId);
            _indexes[j] = _indexes[i];
        }

        _snapshot.snapNum = Bridge._epochNum + 1;
        emit NewSnapshot(_snapshot.snapNum);
    }

    function setUtilityToken(address token) public onlyOwner {
        _EYWA = token;
    }

    function setRelayerPoolFactory(address poolFactory) public onlyOwner {
        _poolFactory = poolFactory;
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
