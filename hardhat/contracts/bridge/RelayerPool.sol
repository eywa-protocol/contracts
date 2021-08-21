// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

// https://confluence.digiu.ai/pages/viewpage.action?pageId=19202711

import {Ownable} from '@openzeppelin/contracts-newone/access/Ownable.sol';
import {EnumerableSet} from '@openzeppelin/contracts-newone/utils/structs/EnumerableSet.sol';
import {IERC20} from '@openzeppelin/contracts-newone/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts-newone/security/ReentrancyGuard.sol';


//todo discuss заморозка через оптимизацию array or enumerableSet with depositId
//todo если решение через depositId - OK то добавляем view методы

library Errors {
    string public constant FEE_IS_TOO_LOW = "FEE_IS_TOO_LOW";
    string public constant FEE_IS_TOO_HIGH = "FEE_IS_TOO_HIGH";
    string public constant SAME_VALUE = "SAME_VALUE";
    string public constant ZERO_ADDRESS = "ZERO_ADDRESS";
    string public constant NOT_DEPOSIT_OWNER = "NOT_DEPOSIT_OWNER";
    string public constant DEPOSIT_IS_LOCKED = "DEPOSIT_IS_LOCKED";
    string public constant INSUFFICIENT_DEPOSIT = "INSUFFICIENT_DEPOSIT";
    string public constant DATA_INCONSISTENCY = "DATA_INCONSISTENCY"; //todo discuss do we need it
}

// stores tokens
contract Vault is Ownable {
    using SafeERC20 for IERC20;
}

contract RelayerPool is  ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;

    uint256 version;
    enum RelayerType {
        Validator,
        Fisher
    }
    enum RelayerStatus {
        Online,
        Offline,
        Inactive,
        BlackListed
    }
    RelayerStatus internal relayerStatus;
    // RelayerType internal relayerType;
    
    uint256 public constant MIN_RELAYER_STAKING_TIME = 4 weeks;
    uint256 constant MIN_STAKING_TIME = 2 weeks;
    uint256 constant MIN_RELAYER_COLLATERAL = 10**18;

    uint256 internal nextDepositId;
    mapping(uint256 => Deposit) public deposits; // id -> deposit
    mapping(address => EnumerableSet.UintSet) internal userDepositIds;
    mapping(address => uint256) userTotalDeposit;
    uint256 internal totalDeposit;
    uint256 internal lastShareRewardTimestamp;
    mapping(address => uint256) userClaimed;
    uint256 internal rewardPerTokenNumerator;
    uint256 constant REWARD_PER_TOKEN_DENOMINATOR = 10 * 18;
    uint256 internal minOwnerCollateral;

    uint256 constant RELAYER_FEE_MIN_NUMERATOR = 100;
    uint256 constant RELAYER_FEE_DENOMINATOR = 10000;
    uint256 public relayerFeeNumerator;
    uint256 public emissionRateNumerator;
    uint256 internal constant EMISSION_RATE_DENOMINATOR = 10000;
    address public poolOwner;
    address public registry;

    address public payableToken;
    address public rewardToken;

    Vault internal vault;

    struct Deposit {
        address user; // todo optimization it's possible to exclude
        uint256 lockTill; //todo optimization is possible uint40
        uint256 amount;
    }

    event DepositPut(address indexed user, uint256 lockTill, uint256 indexed id, uint256 amount);

    event DepositWithdrawn(address indexed user, uint256 indexed id, uint256 amount, uint256 rest);

    constructor(
        address _poolOwner,
        address _depositToken,
        uint256 _relayerFeeNumerator,
        uint256 _emissionRateNumerator
    ) {
        require(_relayerFeeNumerator >= RELAYER_FEE_MIN_NUMERATOR, Errors.FEE_IS_TOO_LOW);
        require(_relayerFeeNumerator <= RELAYER_FEE_DENOMINATOR, Errors.FEE_IS_TOO_HIGH);
        relayerFeeNumerator = _relayerFeeNumerator;
        // todo discuss limits on emissionRate
        emissionRateNumerator = _emissionRateNumerator;
        // require(_rewardToken != address(0), Errors.ZERO_ADDRESS);
        // rewardToken = _rewardToken;
        require(_depositToken != address(0), Errors.ZERO_ADDRESS);
        payableToken = _depositToken;
        require(_poolOwner != address(0), Errors.ZERO_ADDRESS);
        poolOwner = _poolOwner;
        registry = msg.sender;
        lastShareRewardTimestamp = block.timestamp;
        relayerStatus = RelayerStatus.Online;
    }

    modifier onlyRegistry() {
        require(msg.sender == registry, "only registry");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == poolOwner, "only pool owner");
        _;
    }

    function getTotalDeposit() external view returns (uint256) {
        return totalDeposit;
    }

    /// @dev метод для вывода средств из пула, позволяет выводить вызывающему только те средства,
    ///   которые были размещены с его адреса, учитывает сроки заморозки токенов при депозите,
    ///   для владельца адреса Relayer owner address - min_relayer_staking_time=4 недели,
    ///   для стейкеров пула Relayer pool - две недели, максимальное время стейкинга неограничено.
    function withdraw(uint256 _depositId, uint256 _amount) external {
        Deposit storage deposit = deposits[_depositId];
        require(deposit.user == msg.sender, Errors.NOT_DEPOSIT_OWNER);
        require(_amount <= deposit.amount, Errors.INSUFFICIENT_DEPOSIT);
        require(block.timestamp >= deposit.lockTill, Errors.DEPOSIT_IS_LOCKED);
        require(userDepositIds[msg.sender].contains(_depositId), Errors.DATA_INCONSISTENCY);

        harvest(); // ensure user collected reward
        userClaimed[msg.sender] -= (_amount * rewardPerTokenNumerator) / REWARD_PER_TOKEN_DENOMINATOR;

        if (_amount < deposit.amount) {
            deposit.amount -= _amount;
            emit DepositWithdrawn(msg.sender, _depositId, _amount, deposit.amount);
        } else {
            // deposit.amount == amount, because of require condition above (take care!)
            delete deposits[_depositId]; // free up storage slot
            require(userDepositIds[msg.sender].remove(_depositId), Errors.DATA_INCONSISTENCY);
            emit DepositWithdrawn(msg.sender, _depositId, _amount, 0);
        }
        userTotalDeposit[msg.sender] -= _amount; // todo total deposit event
        totalDeposit -= _amount;
        if (msg.sender == poolOwner) {
            require(totalDeposit <= userTotalDeposit[poolOwner] * 6, "small owner stake (ownerStaker*6 >= totalStake)"); //todo err msg
            require(
                userTotalDeposit[poolOwner] >= minOwnerCollateral,
                "small owner stake (ownerStake >= _min_owner_collateral)"
            );
        }
        IERC20(payableToken).safeTransfer(msg.sender, _amount);
    }

    /// @dev метод для отправки транзакциии в стейкинг пул, при добавлении проверяем условие,
    ///   что максимальный суммарный стейк, Pool Stake не превышает Owner stake*6, а минимальнй стейк владельца
    ///   при этом должен быть не менее COLLATERAL.
    function deposit(uint256 _amount) external {
        uint256 depositId = nextDepositId++;
        uint256 lockTill;
        if (msg.sender == poolOwner) {
            lockTill = block.timestamp + MIN_RELAYER_STAKING_TIME;
        } else {
            lockTill = block.timestamp + MIN_STAKING_TIME;
        }
        deposits[depositId] = Deposit({ user: msg.sender, lockTill: lockTill, amount: _amount });
        userTotalDeposit[msg.sender] += _amount;
        totalDeposit += _amount;
        userClaimed[msg.sender] += (_amount * rewardPerTokenNumerator) / REWARD_PER_TOKEN_DENOMINATOR;
        if (msg.sender != poolOwner) {
            require(totalDeposit <= userTotalDeposit[poolOwner] * 6, "small owner stake (ownerStaker*6 >= totalStake)");
        }
        IERC20(payableToken).safeTransferFrom(msg.sender, address(this), _amount);
        emit DepositPut(msg.sender, lockTill, depositId, _amount);
    }

    ///  метод для сбора вознаграждений из смартконтракте Reward, доступен с адреса, который разместил средства,
    ///  на замороженные средства также действует период заморозки
    function harvest() public {
        uint256 reward = ((rewardPerTokenNumerator * userTotalDeposit[msg.sender]) /
            REWARD_PER_TOKEN_DENOMINATOR -
            userClaimed[msg.sender]);
        if (reward == 0) {
            return;
        }
        IERC20(payableToken).safeTransfer(msg.sender, reward);
        userClaimed[msg.sender] += reward;
        // emit RewardHarvest(msg.sender, reward);
    }

    //   Базой для расчёта начислений нужно считать, что мы закладываем фиксированный годовой процент
    //   эмиссии токена для релееров, обозначим его как Emission rate
    //   Обозначим суммарный стейк релеера в его пуле Relayer pool как Pool Stake=SUM Stakei i=0,..,n,
    //   где n - количество записей в контракте Relayer pool.
    //   Тогда дневная прибыль валидатора day profit составляет Day profit=Pool Stake*Emission rate/100/365
    //   Период начисления наград - один раз сутки.
    uint256 internal lastHarvestRewardTimestamp;

    function getLastHarvestRewardTimestamp() external view returns (uint256) {
        return lastHarvestRewardTimestamp;
    }

    function harvestReward() external {
        // todo discuss
        // require(block.timestamp - _lastHarvestRewardTimestamp >= 24*3600)

        // Тогда дневная прибыль валидатора day profit составляет Day profit=Pool Stake*Emission rate/100/365
        uint256 harvestForPeriod = block.timestamp - lastHarvestRewardTimestamp;
        uint256 profit = this.getTotalDeposit() * harvestForPeriod * emissionRateNumerator;
        lastHarvestRewardTimestamp = block.timestamp;

        // fee goes to the owner
        uint256 fee = (profit * relayerFeeNumerator) / RELAYER_FEE_DENOMINATOR;
        uint256 rewardForPool = profit - fee;

        rewardPerTokenNumerator += (rewardForPool * REWARD_PER_TOKEN_DENOMINATOR) / totalDeposit;
        IERC20(rewardToken).safeTransferFrom(address(vault), address(this), profit);
        IERC20(rewardToken).safeTransferFrom(msg.sender, poolOwner, fee);
        // emit Harvest(
        //     block.timestamp,
        //     harvestForPeriod,
        //     profit,
        //     feeReceiver,
        //     fee,
        //     rewardForPool,
        //     rewardPerTokenNumerator
        // );
    }

    function setRelayerStatus(RelayerStatus _status) external onlyRegistry {
        require(relayerStatus != _status, Errors.SAME_VALUE);
        relayerStatus = _status;
        // emit RelayerStatusSet(_status);
    }

    function setRelayerFeeNumerator(uint256 _value) external onlyRegistry {
        require(_value >= RELAYER_FEE_MIN_NUMERATOR, Errors.FEE_IS_TOO_LOW);
        require(_value <= RELAYER_FEE_DENOMINATOR, Errors.FEE_IS_TOO_HIGH);
        relayerFeeNumerator = _value;
        //  emit RelayerFeeSet(_value);
    }
}

// todo discuss
/*
Бизнес-логика начисления наград:
1. Контракт Relayer pool начисляет токены и берёт их из некого контракта, где они уже созданы
2. Контракт Reward управляет логикой начисления этих наград
3. Базой для расчёта начислений нужно считать, что мы закладываем фиксированный годовой процент эмиссии токена для релееров, обозначим его как Emission rate
Обозначим суммарный стейк релеера в его пуле Relayer pool как Pool Stake=SUM Stakei i=0,..,n, где n - количество записей в контракте Relayer pool
Тогда дневная прибыль валидатора day profit составляет Day profit=Pool Stake*Emission rate/100/365
Период начисления наград - один раз сутки
4. Обозначим личный стейк (с адреса Relayer owner address) релеера как Owner stake, минимальное его значение равняется COLLATERAL, в случае его вывода из Relayer pool нода релеера переводится контрактом Reward в состояние inactivate путем вызова метода Update relayer status. При вызове
5. Максимальный суммарный стейк в одиночном пуле Relayer pool составляет личный стейк Owner stake*6
6. Минимальный размер депозита стейкера в Relayer pool составляет COLLATERAL/1000
*/
