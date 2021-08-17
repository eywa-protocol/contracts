//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

// https://confluence.digiu.ai/pages/viewpage.action?pageId=19202711

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {EnumerableSet} from '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/security/ReentrancyGuard.sol';

//todo discuss заморозка через оптимизацию array or enumerableSet with depositId
//todo если решение через depositId - OK то добавляем view методы

library Errors {
    string public constant FEE_IS_TOO_LOW = 'FEE_IS_TOO_LOW';
    string public constant FEE_IS_TOO_HIGH = 'FEE_IS_TOO_HIGH';
    string public constant SAME_VALUE = 'SAME_VALUE';
    string public constant ZERO_ADDRESS = 'ZERO_ADDRESS';
    string public constant NOT_DEPOSIT_OWNER = 'NOT_DEPOSIT_OWNER';
    string public constant DEPOSIT_IS_LOCKED = 'DEPOSIT_IS_LOCKED';
    string public constant INSUFFICIENT_DEPOSIT = 'INSUFFICIENT_DEPOSIT';
    string public constant DATA_INCONSISTENCY = 'DATA_INCONSISTENCY';  //todo discuss do we need it
}

// stores tokens
contract Vault is Ownable {
    using SafeERC20 for IERC20;
}

contract RelayerPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;
    address internal _payableToken;

    uint256 constant MIN_RELAYER_STAKING_TIME = 4 weeks;
    uint256 constant MIN_STAKING_TIME = 2 weeks;

    uint256 internal _nextDepositId;
    mapping (uint256 => Deposit) public _deposits;  // id -> deposit
    mapping (address => EnumerableSet.UintSet) internal _userDepositIds;
    mapping (address => uint256) _userTotalDeposit;
    uint256 internal _totalDeposit;
    uint256 internal _lastShareRewardTimestamp;
    mapping (address => uint256) _userClaimed;
    uint256 internal _rewardPerTokenNumerator;
    uint256 constant REWARD_PER_TOKEN_DENOMINATOR = 10*18;
    uint256 internal _minOwnerCollateral;

//    constructor () {
////        _lastShareRewardTimestamp = block.timestamp;  //
//    }

    function getTotalDeposit() external view returns(uint256){
        return _totalDeposit;
    }

    struct Deposit {
        address user;  // todo optimization it's possible to exclude
        uint256 lockTill;  //todo optimization is possible uint40
        uint256 amount;
    }

    event DepositPut (
        address indexed user,
        uint40 lockFor,
        uint256 indexed id,
        uint256 amount
    );

    event DepositWithdrawn (
        address indexed user,
        uint256 indexed id,
        uint256 amount,
        uint256 rest
    );

    /// @dev метод для вывода средств из пула, позволяет выводить вызывающему только те средства,
    ///   которые были размещены с его адреса, учитывает сроки заморозки токенов при депозите,
    ///   для владельца адреса Relayer owner address - min_relayer_staking_time=4 недели,
    ///   для стейкеров пула Relayer pool - две недели, максимальное время стейкинга неограничено.
    function withdraw(uint256 depositId, uint256 amount) external {
        Deposit storage _deposit = _deposits[depositId];
        require(_deposit.user == msg.sender, Errors.NOT_DEPOSIT_OWNER);
        require(amount <= _deposit.amount, Errors.INSUFFICIENT_DEPOSIT);
        require(block.timestamp >= _deposit.lockTill, Errors.DEPOSIT_IS_LOCKED);
        require(_userDepositIds[msg.sender].contains(depositId), Errors.DATA_INCONSISTENCY);

        harvest();  // ensure user collected reward
        _userClaimed[msg.sender] -= amount * _rewardPerTokenNumerator / REWARD_PER_TOKEN_DENOMINATOR;

        if (amount < _deposit.amount) {
            _deposit.amount -= amount;
            emit DepositWithdrawn(msg.sender, depositId, amount, _deposit.amount);
        } else {  // deposit.amount == amount, because of require condition above (take care!)
            delete _deposits[depositId];  // free up storage slot
            require(_userDepositIds[msg.sender].remove(depositId), Errors.DATA_INCONSISTENCY);
            emit DepositWithdrawn(msg.sender, depositId, amount, 0);
        }
        _userTotalDeposit[msg.sender] -= amount;  // todo total deposit event
        _totalDeposit -= amount;
        if (msg.sender == owner()) {
            require(_totalDeposit <= _userTotalDeposit[owner()] * 6, "small owner stake (ownerStaker*6 >= totalStake)");  //todo err msg
            require(_userTotalDeposit[owner()] >= _minOwnerCollateral, "small owner stake (ownerStake >= _min_owner_collateral)");
        }
        IERC20(_payableToken).safeTransfer(msg.sender, amount);
    }

    /// @dev метод для отправки транзакциии в стейкинг пул, при добавлении проверяем условие,
    ///   что максимальный суммарный стейк, Pool Stake не превышает Owner stake*6, а минимальнй стейк владельца
    ///   при этом должен быть не менее COLLATERAL.
    function deposit(uint256 amount) external {
        uint256 depositId = _nextDepositId++;
        uint256 lockTill;
        if (msg.sender == owner()) {
            lockTill = block.timestamp + MIN_RELAYER_STAKING_TIME;
        } else {
            lockTill = block.timestamp + MIN_STAKING_TIME;
        }
        _deposits[depositId] = Deposit({
            user: msg.sender,
            lockTill: lockTill,
            amount: amount
        });
        _userTotalDeposit[msg.sender] += amount;
        _totalDeposit += amount;
        IERC20(_payableToken).safeTransferFrom(msg.sender, address(this), amount);
        if (msg.sender != owner()) {
            require(_totalDeposit <= _userTotalDeposit[owner()]*6, "small owner stake (ownerStaker*6 >= totalStake)");
        }
        _userClaimed[msg.sender] += amount * _rewardPerTokenNumerator / REWARD_PER_TOKEN_DENOMINATOR;
    }

    /// @dev метод для сбора вознаграждений из смартконтракте Reward, доступен с адреса, который разместил средства,
    ///   на замороженные средства также действует период заморозки
    function harvest() public {
        uint256 reward = (_rewardPerTokenNumerator * _userTotalDeposit[msg.sender] / REWARD_PER_TOKEN_DENOMINATOR
            - _userClaimed[msg.sender]);
        if (reward == 0) {
            return;
        }
        IERC20(_payableToken).safeTransfer(msg.sender, reward);
        _userClaimed[msg.sender] += reward;
//        emit RewardHarvest(msg.sender, reward);
    }

    function onRewardReceived(uint256 reward) external {
        IERC20(_payableToken).safeTransferFrom(msg.sender, address(this), reward);
        _rewardPerTokenNumerator += reward * REWARD_PER_TOKEN_DENOMINATOR / _totalDeposit;
//        emit RewardShared(msg.sender, reward);
    }
}

contract RewardRegistry is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice создать новую ноду-релеер, требует наличия определенного залога COLLATERAL и
    ///   автоматически создаёт новый смартконтракт Relayer pool, привязанный к этой ноде,
    ///   COLLATERAL забирается с кошелька и помещается в связанный контракт Relayer pool.
    ///   Статус в этом случае выставляется в значение online.
    ///   Для успешного вызова этого метода обязательно требуется наличие COLLATERAL на кошельке,
    ///   а также ему нужно передать Relayer key и другие параметры из пункта 4 из процесса регистрации
    function createRelayer() external {
        //todo это конструктор??
        //  или должен вызываться внутри registry контракта

        //todo какой размер collateral? где он задан?

//        _relayerPool = new RelayerPool();
        //todo в чем у нас collateral? erc20? ETH?
//        basicToken.safeTransferFrom(msg.sender, _relayerPool);
    }
}

contract Reward is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 internal _version;   /// @dev текущая версия ПО релеера
    enum RelayerStatus { Online, Offline, Inactive, BlackListed }
    enum RelayerType { Validator, Fisher }
    RelayerStatus internal _relayerStatus;
    RelayerType internal _relayerType;
    address internal _relayerKey;  /// @dev публичный ключ узла, которым он подписывается в пороговой подписи
    RelayerPool internal _relayerPool;
    uint256 internal _emissionRate;
    IERC20 internal _payableToken;

    /// @dev величина комиссии, которая взимается со стейкеров в пуле, задается владельцем узла
    uint256 internal _relayerFeeNumerator;
    uint256 constant RELAYER_FEE_MIN_NUMERATOR = 200;  // todo discuss do we really need min value
    uint256 constant RELAYER_FEE_DENOMINATOR = 10000;
    Vault internal _vault;
    address internal _consensus;
    address internal _rewardToken;

    /// @notice метод может быть вызван только владельцем адреса Relayer owner address,
    ///   это необходимо в случае переустановки ноды
    //todo use Ownable.transferOwnership

    constructor(
        address consensus,
        uint256 relayerFeeNumerator,
        uint256 emissionRate,
        address rewardToken,
        address relayerPool
    ) {
        require(consensus != address(0), Errors.ZERO_ADDRESS);
        _consensus = consensus;
        require(relayerFeeNumerator >= RELAYER_FEE_MIN_NUMERATOR, Errors.FEE_IS_TOO_LOW);
        require(relayerFeeNumerator <= RELAYER_FEE_DENOMINATOR, Errors.FEE_IS_TOO_HIGH);
        _relayerFeeNumerator = relayerFeeNumerator;
        // todo discuss limits
        _emissionRate = emissionRate;
        require(rewardToken != address(0), Errors.ZERO_ADDRESS);
        _rewardToken = rewardToken;
        require(relayerPool != address(0), Errors.ZERO_ADDRESS);
        _relayerPool = RelayerPool(relayerPool);
    }


    /// @notice метод может быть вызван только владельцем адреса Relayer owner address,
    ///   с целью изменения комиссии для стейкеров в его пуле Relayer pool contract address
    function setRelayerFeeNumerator(uint256 value) external onlyOwner {
        require(value >= RELAYER_FEE_MIN_NUMERATOR, Errors.FEE_IS_TOO_LOW);
        require(value <= RELAYER_FEE_DENOMINATOR, Errors.FEE_IS_TOO_HIGH);
        _relayerFeeNumerator = value;
//        emit RelayerFeeSet(value);
    }

    function setVersion(uint256 value) external onlyOwner {
        _version = value;
//        emit VersionSet(value);
    }

    modifier onlyConsensus() {
        require(msg.sender == _consensus, "onlyConsensus");
        _;
    }

    /// @dev метод может быть вызван только нодой сети релееров, которая была выбрана большинством голосов (2/3), для того, чтобы обновить состояние записей в контракте
    function setRelayerStatus(RelayerStatus value) external onlyConsensus {
        require(_relayerStatus != value, Errors.SAME_VALUE);
        _relayerStatus = value;
//        emit RelayerStatusSet(value);
    }

    function getVersion() external view returns(uint256) {
        return _version;
    }

    function getRelayerPool() external view returns(address) {
        return address(_relayerPool);
    }

    function getRelayerKey() external view returns(address) {
        return address(_relayerKey);
    }

    function getRelayerStatus() external view returns(RelayerStatus) {
        return _relayerStatus;
    }

    function getRelayerType() external view returns(RelayerType) {
        return _relayerType;
    }

    function getRelayerFeeNumerator() external view returns(uint256) {
        return _relayerFeeNumerator;
    }

    function getConsensus() external view returns(address) {
        return _consensus;
    }

    /// @notice Базой для расчёта начислений нужно считать, что мы закладываем фиксированный годовой процент
    ///   эмиссии токена для релееров, обозначим его как Emission rate
    ///   Обозначим суммарный стейк релеера в его пуле Relayer pool как Pool Stake=SUM Stakei i=0,..,n,
    ///   где n - количество записей в контракте Relayer pool.
    ///   Тогда дневная прибыль валидатора day profit составляет Day profit=Pool Stake*Emission rate/100/365
    ///   Период начисления наград - один раз сутки.
    uint256 internal _lastHarvestRewardTimestamp;

    function getLastHarvestRewardTimestamp() external view returns(uint256) {
        return _lastHarvestRewardTimestamp;
    }

    function harvestReward() external {
        // todo discuss
        // require(block.timestamp - _lastHarvestRewardTimestamp >= 24*3600)

        // Тогда дневная прибыль валидатора day profit составляет Day profit=Pool Stake*Emission rate/100/365
        uint256 harvestForPeriod = block.timestamp - _lastHarvestRewardTimestamp;
        uint256 profit = _relayerPool.getTotalDeposit() * harvestForPeriod * _emissionRate;
        _lastHarvestRewardTimestamp = block.timestamp;

        IERC20(_payableToken).safeTransferFrom(address(_vault), address(this), profit);

        // fee
        uint256 fee = profit * _relayerFeeNumerator / RELAYER_FEE_DENOMINATOR;
        uint256 rewardForPool = profit - fee;

        _relayerPool.onRewardReceived(rewardForPool);

        // todo emit
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