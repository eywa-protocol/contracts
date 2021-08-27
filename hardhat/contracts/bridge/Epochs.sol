pragma solidity ^0.8.0;

contract Epochs {

    Epoch[] public epochs;

    struct Epoch {
        string ePubKey;
        uint256 time;
    }

    constructor(string memory _ownerPKey) GenesisEpoch() {
        StartNewEpochInternal(_ownerPKey);
    }

    function StartNewEpoch(string memory _pKey) NotGenesisEpoch()  external  {
        StartNewEpochInternal(_pKey);
    }

    function StartNewEpochInternal(string memory _pKey) internal {
        Epoch memory e = Epoch(_pKey, block.timestamp);
        epochs.push(e);
    }

    function getLastEpoch() external view returns (Epoch memory) {
        return epochs[epochs.length - 1];
    }

    modifier GenesisEpoch() {
        require (epochs.length == 0, "epoch exists");
        _;
    }

    modifier NotGenesisEpoch() {
        require (epochs.length > 0, "no epoch");
        _;
    }




}
