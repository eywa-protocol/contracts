// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./RelayerPool.sol";

library RelayerPoolFactory {
    function create(
        address _owner,
        address _rewardToken,
        address _depositToken,
        uint256 _relayerFeeNumerator,
        uint256 _emissionAnnualRateNumerator,
        address _vault
    ) external returns (RelayerPool) {
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
