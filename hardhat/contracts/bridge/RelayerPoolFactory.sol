// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/access/Ownable.sol";
import "./RelayerPool.sol";

contract RelayerPoolFactory is Ownable {
    address public nodeRegistry;

    modifier isNodeRegistry(){
        require(msg.sender == nodeRegistry);
        _;
    }

    function setNodeRegistry(address _nodeRegistry) external onlyOwner{
        nodeRegistry = _nodeRegistry;
    }

    function create(
        address _owner,
        address _rewardToken,
        address _depositToken,
        uint256 _relayerFeeNumerator,
        uint256 _emissionAnnualRateNumerator,
        address _vault
    ) external isNodeRegistry returns (RelayerPool) {
        return new RelayerPool(
            _owner,
            _rewardToken,
            _depositToken,
            _relayerFeeNumerator,
            _emissionAnnualRateNumerator,
            _vault
        );
    }
}
