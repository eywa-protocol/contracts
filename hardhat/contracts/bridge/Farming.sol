//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import {IERC20} from '@openzeppelin/contracts-newone/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts-newone/security/ReentrancyGuard.sol';

interface IFarming {
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Harvest(address indexed user, uint256 amount);
    event RewardShared(address indexed user, uint256 amount);
    function getDeposit(address user) external view returns(uint256);
    function getReward(address user) external view returns(uint256);
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function harvest() external;
    function shareReward(uint256 amount) external;
}

contract FarmingNaive is IFarming, ReentrancyGuard {
    using SafeERC20 for IERC20;

    //    uint256 internal _totalReward;
    uint256 internal _totalDeposit;
    uint256 internal _rewardPerDepositNumerator;
    mapping(address => uint256) internal _userDeposit;
    mapping(address => uint256) internal _userClaimedReward;
    address internal immutable _payableToken;
    address internal immutable _depositToken;
    uint256 internal constant FACTOR_DENOMINATOR = 10 ** 8;  // todo do we really need it?

    constructor (address depositToken, address payableToken) {
        require(depositToken != address(0), "ZERO_ADDRESS");
        require(payableToken != address(0), "ZERO_ADDRESS");
        _payableToken = payableToken;
        _depositToken = depositToken;
    }

    function getDeposit(address user) override external view returns(uint256) {
        return _userDeposit[user];
    }

    function getReward(address user) override external view returns(uint256) {
        return _userDeposit[user] * _rewardPerDepositNumerator / FACTOR_DENOMINATOR - _userClaimedReward[user];
    }

    function deposit(uint256 amount) override external nonReentrant {
        IERC20(_depositToken).safeTransferFrom(msg.sender, address(this), amount);
        _totalDeposit += amount;
        _userDeposit[msg.sender] += amount;
        _userClaimedReward[msg.sender] += amount * _rewardPerDepositNumerator / FACTOR_DENOMINATOR;
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) override external nonReentrant {
        _harvest();
        IERC20(_depositToken).safeTransfer(msg.sender, amount);
        _totalDeposit -= amount;
        _userDeposit[msg.sender] -= amount;
        _userClaimedReward[msg.sender] -= amount * _rewardPerDepositNumerator / FACTOR_DENOMINATOR;  // todo check subzero
        emit Withdraw(msg.sender, amount);
    }

    function harvest() external override nonReentrant {
        _harvest();
    }

    function _harvest() internal {
        uint256 totalUserReward = _userDeposit[msg.sender] * _rewardPerDepositNumerator / FACTOR_DENOMINATOR;
        uint256 reward = totalUserReward - _userClaimedReward[msg.sender];
        _userClaimedReward[msg.sender] += reward;
        emit Harvest(msg.sender, reward);
        IERC20(_payableToken).safeTransfer(msg.sender, reward);
    }

    function shareReward(uint256 amount) external override nonReentrant {
        IERC20(_payableToken).safeTransferFrom(msg.sender, address(this), amount);
        _rewardPerDepositNumerator += amount * FACTOR_DENOMINATOR;
        emit RewardShared(msg.sender, amount);
    }
}

// inspired by https://github.com/O3Labs/o3swap-contracts/blob/main/contracts/core/assets/O3Token/O3.sol


contract FarmingUnlockSpeed is IFarming, ReentrancyGuard {
    using SafeERC20 for IERC20;

    mapping (address => uint256) private _unlocks;  // user -> unlock amount
    uint256 internal _totalReward;
    uint256 internal _totalDeposit;
    mapping(address => uint256) internal _userDeposit;
    mapping(address => uint256) internal _userClaimedReward;
    address internal immutable _depositToken;
    address internal immutable _payableToken;
    address internal immutable _unfreezeToken;

    uint256 internal _rewardPerDepositNumerator;
    uint256 public constant FACTOR_DENOMINATOR = 10 ** 8;

    mapping (address => uint256) private _unlockFactor;
    mapping (address => uint256) private _unlockBlockGap;

    function unlockedOf(address account) external view returns (uint256) {
        return _unlocks[account];
    }

    function lockedOf(address account) public view returns (uint256) {
        return _userDeposit[account] - _unlocks[account];  //todo change care!
    }

    constructor (address depositToken, address payableToken, address unfreezeToken) {
        require(depositToken != address(0), "ZERO_ADDRESS");
        require(payableToken != address(0), "ZERO_ADDRESS");
        require(unfreezeToken != address(0), "ZERO_ADDRESS");
        _depositToken = depositToken;
        _payableToken = payableToken;
        _unfreezeToken = unfreezeToken;
    }

    function _getUnlockSpeed(address token, address staker, uint256 lpStaked) internal view returns (uint256) {
        uint256 toBeUnlocked = lockedOf(staker);
        uint256 unlockSpeed = _unlockFactor[token] * lpStaked;
        uint256 maxUnlockSpeed = toBeUnlocked * FACTOR_DENOMINATOR / _unlockBlockGap[token];
        if(unlockSpeed > maxUnlockSpeed) {
            unlockSpeed = maxUnlockSpeed;
        }
        return unlockSpeed;
    }

    function _unlockTransfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        _unlocks[sender] = _unlocks[sender] - amount;
        _unlocks[recipient] = _unlocks[recipient] + amount;
//        emit LOG_UNLOCK_TRANSFER(sender, recipient, amount);
    }

    function _settleUnlockAmount(address staker, address token, uint256 lpStaked, uint256 upToBlockNumber) internal view returns (uint256) {
        uint256 unlockSpeed = _getUnlockSpeed(token, staker, lpStaked);
        uint256 blocks = block.number - upToBlockNumber;
        uint256 unlockedAmount = unlockSpeed * blocks / FACTOR_DENOMINATOR;
        uint256 lockedAmount = unclaimedRewardOf(staker);
        if (unlockedAmount > lockedAmount) {
            unlockedAmount = lockedAmount;
        }
        return unlockedAmount;
    }

    function getDeposit(address user) external override view returns(uint256) {
        return _userDeposit[user];
    }

    function getReward(address user) external override view returns(uint256) {
        return _userDeposit[user] * _rewardPerDepositNumerator / FACTOR_DENOMINATOR - _userClaimedReward[user];
    }

    function deposit(uint256 amount) external override nonReentrant {
        IERC20(_depositToken).safeTransferFrom(msg.sender, address(this), amount);
        _totalDeposit += amount;
        _userDeposit[msg.sender] += amount;
        _userClaimedReward[msg.sender] += amount * _rewardPerDepositNumerator / FACTOR_DENOMINATOR;
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) override external nonReentrant {
        _harvest();
        IERC20(_depositToken).safeTransfer(msg.sender, amount);
        _totalDeposit -= amount;
        _userDeposit[msg.sender] -= amount;
        _userClaimedReward[msg.sender] -= amount * _rewardPerDepositNumerator / FACTOR_DENOMINATOR;  // todo check subzero
        emit Withdraw(msg.sender, amount);
    }

    function harvest() external override nonReentrant {
        _harvest();
    }

    function _harvest() internal {
        uint256 reward = unclaimedRewardOf(msg.sender);
//  todo       uint256 unfreezed = _settleUnlockAmount(msg.sender);
        uint256 unfreezed = 0;
        if (reward < unfreezed) {
            reward = unfreezed;
            // todo update user record to memorize last harvest block
        }
        _userClaimedReward[msg.sender] += reward;
        emit Harvest(msg.sender, reward);
        IERC20(_payableToken).safeTransfer(msg.sender, reward);
    }

    function unclaimedRewardOf(address user) public view returns(uint256) {
        uint256 totalUserReward = _userDeposit[msg.sender] * _rewardPerDepositNumerator / FACTOR_DENOMINATOR;
        return totalUserReward - _userClaimedReward[user];
    }

    function shareReward(uint256 amount) override external nonReentrant {
        IERC20(_payableToken).safeTransferFrom(msg.sender, address(this), amount);
        _rewardPerDepositNumerator += amount * FACTOR_DENOMINATOR;
        emit RewardShared(msg.sender, amount);
    }
}

