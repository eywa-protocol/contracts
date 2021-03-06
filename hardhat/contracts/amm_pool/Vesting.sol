// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/utils/math/Math.sol";
import "@openzeppelin/contracts-newone/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-newone/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts-newone/utils/Counters.sol";
import "@openzeppelin/contracts-newone/access/Ownable.sol";

/**
 * @dev Interface of policy contract for permission for claim.
 */
interface IVestingPolicy {
    /**
     * @dev Returns number of tokens, which are permitted to claim
     * for this address.
     *
     */
    function permittedForClaim(address) external view returns (uint256);


     /**
     * @dev Decrease permitted amount of tokens to claim
     * for this address.
     *
     */
    function decreaseAnountToClaim(address, uint256) external returns (bool);
}

contract EywaVesting is ERC20, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    // Relative timestamp to use transfer/transferFrom without permission
    uint256 public permissionlessTimeStamp; 

    // Absolute timestamp of vesting period start 
    uint256 public started;

    // Token which is vested on this contract
    IERC20 public immutable eywaToken;

    struct cliffData{
        // Relative timestamp first cliff duration    
        uint256 cliffDuration1; 

        // Claimable number of tokens after first cliff period
        uint256 cliffAmount1; 

        // Relative timestamp second cliff duration    
        uint256 cliffDuration2; 

        // Claimable number of tokens after second cliff period
        uint256 cliffAmount2; 

        // Relative timestamp third cliff duration    
        uint256 cliffDuration3; 

        // Claimable number of tokens after third cliff period
        uint256 cliffAmount3; 
    }

    cliffData public cliffs;

    // Duration of one linear or discrete step
    uint256 public stepDuration; 

    // Number linear or discrete steps
    uint256 public numOfSteps; 

    // Relative timestamp to claim without permission
    uint256 claimWithAllowanceTimeStamp;

    // Contract which gives permission to claim before claimWithAllowanceTimeStamp
    IVestingPolicy public claimAllowanceContract;
    
    /**
     * The number of claimed tokens in ``address``'s account.
     * Note: it doesn't necessary represent how much ``address`` claimed
     * because after transfer/transfer from, it also changes this number proportionately.
     * Note: it is used for math calculation of available to claim tokens.
     */
    mapping(address => uint256) public claimed; // how much already claimed

    // Initial amount of eywa vested on this contract
    uint256 public vEywaInitialSupply;

    /**
     * The number of tokens in ``address``'s account as if there were no burning tokens
     * Note: it is used for math calculation of available to claim tokens
     */
    mapping(address => uint256) public unburnBalanceOf;

    /**
     * The number of tokens allowed for transfer/transferFrom 
     * from ``address``'s account to another ``address``'s account.
     * Note: It uses address(0) for permission for staking to staking contract
     * or to unstake from it.
     */
    mapping(address => mapping(address => uint256)) public transferPermission;

    /**
     * @dev Emitted when address`from` claimed amount `amount` tokens.
     */
    event ReleasedAfterClaim(address indexed from, uint256 indexed amount);


    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` of the token
     * and also sets eywa token's address.
     */
    constructor(IERC20 _eywaToken) ERC20("Vested Eywa", "vEYWA") {
        eywaToken = _eywaToken;
    }

    /**
     * @dev Initializes main parameters for vesting period 
     * @param _claimAllowanceContract - address of contract which gives permission to claim before claimWithAllowanceTimeStamp
     * @param _claimWithAllowanceTimeStamp - relative timestamp to claim without permission
     * @param _started - absolute timestamp of vesting period start 
     * @param _cliffs - data of three cliffs
     * @param _stepDuration - duration of one linear or discrete step
     * @param _allStepsDuration - duration of all linear or discrete steps
     * @param _permissionlessTimeStamp - relative timestamp to use transfer/transferFrom without permission
     * @param _initialAddresses - intitial token owners list
     * @param _initialSupplyAddresses - intitial token owners balances list
     *
     * Requirements:
     * - can be used only once
     * - _started should not be equal to 0
     * - _started should not be equal or bigger than current timestamp
     * - can be used only by owner
     *
     */
    function initialize(
        IVestingPolicy _claimAllowanceContract,
        uint256 _claimWithAllowanceTimeStamp,
        uint256 _started,
        cliffData memory _cliffs,
        uint256 _stepDuration,
        uint256 _allStepsDuration,
        uint256 _permissionlessTimeStamp,
        address[] calldata _initialAddresses,
        uint256[] calldata _initialSupplyAddresses
    ) external onlyOwner {
        require(started == 0, "Contract is already initialized");
        require(_started != 0, "_started can't be equal zero value");
        require(_started >= block.timestamp, "_started is less then current block.timestamp");

        claimWithAllowanceTimeStamp = _claimWithAllowanceTimeStamp;
        claimAllowanceContract = _claimAllowanceContract;
        started = _started;
        cliffs.cliffDuration1 = _cliffs.cliffDuration1;
        cliffs.cliffAmount1 = _cliffs.cliffAmount1;
        cliffs.cliffDuration2 = _cliffs.cliffDuration2;
        cliffs.cliffAmount2 = _cliffs.cliffAmount2;
        cliffs.cliffDuration3 = _cliffs.cliffDuration3;
        cliffs.cliffAmount3 = _cliffs.cliffAmount3;
        stepDuration = _stepDuration;
        permissionlessTimeStamp = _permissionlessTimeStamp;

        for (uint256 i = 0; i < _initialAddresses.length; i++) {
            _mint(_initialAddresses[i], _initialSupplyAddresses[i]);
            vEywaInitialSupply = vEywaInitialSupply + _initialSupplyAddresses[i];
            unburnBalanceOf[_initialAddresses[i]] = _initialSupplyAddresses[i];
        }
        numOfSteps = _allStepsDuration / _stepDuration;
        IERC20(eywaToken).safeTransferFrom(msg.sender, address(this), vEywaInitialSupply);
    }

    /**
     * @dev Change vesting policy contract
     * @param newContract - set new contract for vesting policy
     *
     * Requirements:
     * - can be used only by owner
     *
     */
    function renounceClaimAllowanceContract(IVestingPolicy newContract) external onlyOwner {
        claimAllowanceContract = newContract;
    }

    /**
     * @dev Returns permitted by vesting policy contract amount to claim 
     * @param tokenOwner - token owner
     *
     */
    function permittedAmountToClaim(address tokenOwner) public view returns (uint256) {
        return IVestingPolicy(claimAllowanceContract).permittedForClaim(tokenOwner);
    }

    /**
     * @dev Returns permitted amount to transfer 
     * @param from - sender address
     * @param to - recepient address
     *
     */
    function getCurrentTransferPermission(address from, address to) external view returns (uint256) {
        return transferPermission[from][to];
    }

    /**
     * @dev Increase permission to send tokens for this pair addresses
     * @param from - sender address
     * @param to - recepient address
     * @param amount - number of increase amount
     *
     * Requirements:
     * - can be used only by owner
     *
     */
    function increaseTransferPermission(
        address from,
        address to,
        uint256 amount
    ) external onlyOwner {
        transferPermission[from][to] = transferPermission[from][to] + amount;
    }

    /**
     * @dev Decrease permission to send tokens for this pair addresses
     * @param from - sender address
     * @param to - recepient address
     * @param amount - number of decrease amount
     *
     * Requirements:
     * - can be used only by owner
     *
     */
    function decreaseTransferPermission(
        address from,
        address to,
        uint256 amount
    ) external onlyOwner {
        transferPermission[from][to] = transferPermission[from][to] - amount;
    }

    /**
     * @dev Returns number of token available to claim for tokenOwner in the time.
     * @param time - timestamp
     * @param tokenOwner - address of token owner
     *
     */
    function available(uint256 time, address tokenOwner) public view returns (uint256) {
        if (claimable(time) >= vEywaInitialSupply) {
            return balanceOf(tokenOwner);
        }
        if (claimable(time) * unburnBalanceOf[tokenOwner] / vEywaInitialSupply >= claimed[tokenOwner]) {
            return (claimable(time) * unburnBalanceOf[tokenOwner] / vEywaInitialSupply) - claimed[tokenOwner];
        } else {
            return 0;
        }
    }

    /**
     * @dev Returns number of token available to claim after first cliff for address who owns
     * 'ownedTokens' tokens number.
     * @param ownedTokens - number of tokens
     *
     */
    function availableAfterFirstCliff(uint256 ownedTokens) public view returns (uint256) {
        if (ownedTokens == 0) {
            return 0;
        }
        return (claimable(started + cliffs.cliffDuration1) * ownedTokens / vEywaInitialSupply);
    }


    /**
     * @dev Updates claimed and unburnBalanceOf mappings for math calculation next available amount of tokens
     * after transfer/transferFrom functions
     * @param sender - sender address
     * @param recipient - recepient address
     * @param amount - number of transfer amount
     *
     */
    function updateUnburnBalanceAndClaimed(
        address sender,
        address recipient,
        uint256 amount
    ) private {
        uint256 claimedNumberTransfer = claimed[sender] * amount / unburnBalanceOf[sender];
        uint256 remainderIncrease;
        if ((claimed[sender] * amount) % unburnBalanceOf[sender] > 0) {
            remainderIncrease = 1;
        }
        claimed[sender] = claimed[sender] - claimedNumberTransfer;
        claimed[recipient] = claimed[recipient] + claimedNumberTransfer + remainderIncrease;
        unburnBalanceOf[sender] = unburnBalanceOf[sender] - amount;
        unburnBalanceOf[recipient] = unburnBalanceOf[recipient] + amount;
    }

    /**
     * @dev Returns total amount is claimable for the time
     * @param time - timestamp
     *
     * Note: it doesn't include burn amount in calculation.
     *
     */
    function claimable(uint256 time) public view returns (uint256) {
        if (time == 0) {
            return 0;
        }
        uint256 cliffSum;
        if (time < started + cliffs.cliffDuration1) {
            return 0;
        } 
        if (time >= started + cliffs.cliffDuration1){
            cliffSum = cliffSum + cliffs.cliffAmount1;
            if (time >= started + cliffs.cliffDuration1 + cliffs.cliffDuration2){
                cliffSum = cliffSum + cliffs.cliffAmount2;
                if (time >= started + cliffs.cliffDuration1 + cliffs.cliffDuration2 + cliffs.cliffDuration3){
                    cliffSum = cliffSum + cliffs.cliffAmount3;
                    uint256 passedSinceCliff = time - (started + cliffs.cliffDuration1 + cliffs.cliffDuration2 + cliffs.cliffDuration3);
                    uint256 stepsPassed = Math.min(numOfSteps, passedSinceCliff / stepDuration);
                    if (stepsPassed >= numOfSteps) {
                        return vEywaInitialSupply;
                    }
                    return cliffSum + ((vEywaInitialSupply - cliffs.cliffAmount1 - cliffs.cliffAmount2 - cliffs.cliffAmount3) * stepsPassed / numOfSteps);
                }
            }
        }
        return cliffSum;
    }

    /**
     * @dev Claim to release certain amount of vested tokens
     * @param claimedAmount - number of tokens to release
     *
     * Requirements:
     * - claimedAmount should be less or equal to available amount
     * - if there is not claimWithAllowanceTimeStampm you should have permission for it
     *
     * Emits an {ReleasedAfterClaim} event.
     *
     */
    function claim(uint256 claimedAmount) external nonReentrant {
        uint256 availableAmount = available(block.timestamp, msg.sender);
        if (started + claimWithAllowanceTimeStamp > block.timestamp) {
            uint256 amountWithPermission = permittedAmountToClaim(msg.sender);
            require(amountWithPermission >= claimedAmount, "Don't have permission for this amount for early claim");
            bool isDecreased = IVestingPolicy(claimAllowanceContract).decreaseAnountToClaim(msg.sender, claimedAmount);
            require(isDecreased == true, "Can't spend permission for this claim");
        }
        require(claimedAmount > 0, "Claimed amount is 0");
        require(availableAmount >= claimedAmount, "the amount is not available");
        claimed[msg.sender] = claimed[msg.sender] + claimedAmount;
        _burn(msg.sender, claimedAmount);
        IERC20(eywaToken).safeTransfer(msg.sender, claimedAmount);
        emit ReleasedAfterClaim(msg.sender, claimedAmount);
    }

    function transfer(address recipient, uint256 amount) public override nonReentrant returns (bool) {
        require(started <= block.timestamp, "It is not started time yet");
        bool result;
        if (block.timestamp < started + permissionlessTimeStamp) {
            uint256 maxStakinPermission = Math.max(transferPermission[msg.sender][address(0)], transferPermission[address(0)][recipient]);
            uint256 permissionAmount = Math.max(transferPermission[msg.sender][recipient], maxStakinPermission);
            require(amount <= permissionAmount, "This early transfer doesn't have permission");
            if (transferPermission[msg.sender][recipient] > maxStakinPermission){
                transferPermission[msg.sender][recipient] = transferPermission[msg.sender][recipient] - amount;
            }
            updateUnburnBalanceAndClaimed(msg.sender, recipient, amount);
            result = super.transfer(recipient, amount);
            return result;
        } else {
            updateUnburnBalanceAndClaimed(msg.sender, recipient, amount);
            result = super.transfer(recipient, amount);
            return result;
        }
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override nonReentrant returns (bool) {
        require(started <= block.timestamp, "It is not started time yet");
        bool result;
        if (block.timestamp < started + permissionlessTimeStamp) {
            uint256 maxStakinPermission = Math.max(transferPermission[sender][address(0)], transferPermission[address(0)][recipient]);
            uint256 permissionAmount = Math.max(transferPermission[sender][recipient], maxStakinPermission);
            require(amount <= permissionAmount, "This early transfer doesn't have permission");
            if (transferPermission[sender][recipient] > maxStakinPermission){
                transferPermission[sender][recipient] = transferPermission[sender][recipient] - amount;
            }
            updateUnburnBalanceAndClaimed(sender, recipient, amount);
            result = super.transferFrom(sender, recipient, amount);
            return result;
        } else {
            updateUnburnBalanceAndClaimed(sender, recipient, amount);
            result = super.transferFrom(sender, recipient, amount);
            return result;
        }
    }
}
