// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface ISynthesis {
    struct SynthParams {
        address receiveSide;
        address oppositeBridge;
        uint256 chainId;
    }

    struct PermitData {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 deadline;
        bool approveMax;
    }

    function mintSyntheticToken(
        bytes32 txId,
        address tokenReal,
        uint256 amount,
        address to
    ) external;

    function burnSyntheticToken(
        address _stoken,
        uint256 _amount,
        address _from,
        address _to,
        SynthParams calldata _synthParams
    ) external returns (bytes32 txID);

    function getTxId() external returns (bytes32);

    function synthTransfer(
        address tokenSynth,
        uint256 amount,
        address from,
        address to,
        SynthParams calldata params
    ) external;

    function burnSyntheticTokenToSolana(
        address tokenSynth,
        address from,
        bytes32[] calldata pubkeys,
        uint256 amount,
        uint256 chainId
    ) external;

    function emergencyUnsyntesizeRequest(
        bytes32 txID,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function emergencyUnsyntesizeRequestToSolana(
        address from,
        bytes32[] calldata pubkeys,
        bytes1 bumpSynthesizeRequest,
        uint256 chainId
    ) external;

    function getRepresentation(bytes32 _rtoken) external view returns (address);
}
