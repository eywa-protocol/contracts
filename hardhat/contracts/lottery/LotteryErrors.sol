// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


library LotteryErrors {
    string public constant ZERO_WEIGHT = "Lottery: weight should be more than 0";
    string public constant SHUFFLED = "Lottery: lottery is shuffled";
    
}