// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts-newone/token/ERC20/extensions/draft-ERC20Permit.sol";
import "../utils/@opengsn/contracts/src/BaseRelayRecipient.sol";
import "./RelayerPool.sol";

//  Создать новую ноду-релеер, требует наличия определенного залога COLLATERAL и
//  автоматически создаёт новый смартконтракт Relayer pool, привязанный к этой ноде,
//  COLLATERAL забирается с кошелька и помещается в связанный контракт Relayer pool.
//  Статус в этом случае выставляется в значение online.
//  Для успешного вызова этого метода обязательно требуется наличие COLLATERAL на кошельке,
//  а также ему нужно передать Relayer key и другие параметры из пункта 4 из процесса регистрации

contract NodeRegistry is BaseRelayRecipient {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    struct Node {
        address owner;
        address nodeWallet;
        address pool;
        address nodeIdAddress;
        string  blsPubKey;
        uint256 nodeId;
    }

    // struct NodeInitParams {
    //     uint256 relayerFeeNumerator;
    //     uint256 emissionRateNumerator;
    //     address rewardToken;
    //     address vault;
    // }

    address public EYWA;
    uint256 public constant MIN_COLLATERAL = 1 ether; //TODO discuss

    EnumerableSet.AddressSet nodes;
    mapping(address => Node) public nodeRegistry;
    mapping(address => mapping(address => bool)) public trustListForDex;

    event CreatedRelayer(
        address indexed nodeIdAddress,
        uint256 indexed nodeId,
        address indexed relayerPool,
        address owner
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

    modifier isNewNode(address _nodeIdAddr) {
        require(
            nodeRegistry[_nodeIdAddr].nodeWallet == address(0),
            string(abi.encodePacked("node ", convertToString(_nodeIdAddr), " allready exists"))
        );
        _;
    }

    modifier existingNode(address _nodeIdAddr) {
        require(
            nodeRegistry[_nodeIdAddr].nodeWallet != address(0),
            string(abi.encodePacked("node ", convertToString(_nodeIdAddr), " does not exist"))
        );
        _;
    }

    //TODO: discuss about check: nodeRegistry[_blsPointAddr] == address(0)
    function addNode(Node memory node) internal isNewNode(node.nodeIdAddress) {
        require(node.owner != address(0), Errors.ZERO_ADDRESS);
        require(node.nodeWallet != address(0), Errors.ZERO_ADDRESS);
        require(node.nodeIdAddress != address(0), Errors.ZERO_ADDRESS);
        node.nodeId = nodes.length();
        nodeRegistry[node.nodeIdAddress] = node;
        nodes.add(node.nodeIdAddress);
        //TODO: discuss about pemission for certain bridge
        trustListForDex[node.nodeWallet][address(0)] = true;

        emit CreatedRelayer(node.nodeIdAddress, node.nodeId, node.pool, node.owner);
    }

    function getNode(address _nodeIdAddress) external view returns (Node memory) {
        return nodeRegistry[_nodeIdAddress];
    }

    function getNodes() external view returns (Node[] memory) {
        Node[] memory allNodes = new Node[](nodes.length());
        for (uint256 i = 0; i < nodes.length(); i++) {
            allNodes[i] = nodeRegistry[nodes.at(i)];
        }
        return allNodes;
    }

    function getBLSPubKeys() external view returns (string[] memory) {
        string[] memory pubKeys = new string[](nodes.length());
        for (uint256 i = 0; i < nodes.length(); i++) {
            pubKeys[i] = nodeRegistry[nodes.at(i)].blsPubKey;
        }
        return pubKeys;
    }

    /// @notice Преобразовать адрес в строку для require()
    function convertToString(address account) public pure returns (string memory s) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory data = abi.encodePacked(account);
        bytes memory result = new bytes(2 + data.length * 2);
        result[0] = "0";
        result[1] = "x";
        for (uint256 i = 0; i < data.length; i++) {
            result[2 + i * 2] = alphabet[uint256(uint8(data[i] >> 4))];
            result[3 + i * 2] = alphabet[uint256(uint8(data[i] & 0x0f))];
        }
        return string(result);
    }

    function nodeExists(address _nodeIdAddr) public view returns (bool) {
        return nodeRegistry[_nodeIdAddr].nodeWallet != address(0);
    }

    function checkPermissionTrustList(address _node) external view returns (bool) {
        return trustListForDex[_node][address(0)];
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
            1000,          // emissionRateNumerator  (test only)
            _node.owner    // vault                  (test only)
        );
        uint256 nodeBalance = IERC20(EYWA).balanceOf(_msgSender());
        require(nodeBalance >= MIN_COLLATERAL, "insufficient funds");
        IERC20Permit(EYWA).permit(_msgSender(), address(this), nodeBalance, _deadline, _v, _r, _s);
        IERC20(EYWA).safeTransferFrom(_msgSender(), address(relayerPool), nodeBalance);
        _node.pool = address(relayerPool);
        addNode(_node);
    }

    //todo если валидатор плохой то перебросить средства одним коллом с одного relayerPool на другой

    string public override versionRecipient = "2.2.3";
}
