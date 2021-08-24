// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./IRelayerPool.sol";

interface INodeRegistry {
    struct Node {
        address owner;
        address nodeWallet;
        address nodeIdAddress;
        string  blsPubKey;
        address pool;
        uint256 version;
        uint256 nodeId;
        uint256 relayerFeeNumerator;
        uint256 emissionRateNumerator;
        IRelayerPool.RelayerStatus status;
        IRelayerPool.RelayerType nodeType;
    }

    function addNode(Node memory node) external;

    function getNode(address _nodeIdAddress) external view returns (Node memory);

    function getNodes() external view returns (Node[] memory);

    function getBLSPubKeys() external view returns (string[] memory);

    function convertToString(address account) external pure returns (string memory s);

    function nodeExists(address _nodeIdAddr) external view returns (bool);

    function checkPermissionTrustList(address _node) external view returns (bool);

    //TODO
    function setRelayerFee(uint256 _fee, address _nodeIdAddress) external;

    function setRelayerStatus(IRelayerPool.RelayerStatus _status, address _nodeIdAddress) external;

    function createRelayer(
        Node memory _node,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external;
}
