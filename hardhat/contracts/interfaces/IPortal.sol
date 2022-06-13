// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./ICurveProxy.sol";

interface IPortal {
    struct PermitData {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 deadline;
        bool approveMax;
    }

    struct SynthParams {
        address receiveSide;
        address oppositeBridge;
        uint256 chainId;
    }

    function synthesize(
        address token,
        uint256 amount,
        address from,
        address to,
        SynthParams calldata params
    ) external;

    function synthesizeWithPermit(
        PermitData calldata permitData,
        address token,
        uint256 amount,
        address from,
        address to,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId
    ) external;

    function synthesizeToSolana(
        address token,
        uint256 amount,
        address from,
        bytes32[] calldata pubkeys,
        bytes1 txStateBump,
        uint256 chainId
    ) external;

    function emergencyUnburnRequest(
        bytes32 txID,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function emergencyUnburnRequestToSolana(
        bytes32 txID,
        address from,
        bytes32[] calldata pubkeys,
        uint256 chainId
    ) external;

    function transitSynthBatchMetaExchangeRequest(
        address[] memory _token,
        uint256[] memory _amount,
        address _from,
        SynthParams memory _synthParams,
        ICurveProxy.MetaExchangeParams memory _metaParams,
        ICurveProxy.EmergencyUnsynthParams memory _unsynthParams
    ) external;

    function transitSynthBatchAddLiquidity3PoolMintEUSDRequest(
        address[] memory _token,
        uint256[] memory _amount,
        address _from,
        SynthParams memory _synthParams,
        ICurveProxy.MetaMintEUSD memory _metaParams,
        ICurveProxy.EmergencyUnsynthParams memory _unsynthParams
    ) external;
}
