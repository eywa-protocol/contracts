pragma solidity ^0.8.0;

contract Epochs {

    Epoch[] public epochs;

    struct Epoch {
        bytes ePubKey;
        uint256 time;
    }

    constructor(bytes memory _ownerPKey) GenesisEpoch() {
        StartNewEpochInternal(_ownerPKey);
    }

    function StartNewEpoch(bytes memory _pKey) NotGenesisEpoch()  external  {
        StartNewEpochInternal(_pKey);
    }

    function StartNewEpochInternal(bytes memory _pKey) internal {
        Epoch memory e = Epoch(_pKey, block.timestamp);
        epochs.push(e);
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
