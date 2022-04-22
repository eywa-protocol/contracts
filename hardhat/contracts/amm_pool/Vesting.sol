// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/utils/math/Math.sol";
import "@openzeppelin/contracts-newone/utils/math/SafeMath.sol";
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
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    uint256 public permissionlessTimeStamp; // timestamp for transfer without permission
    uint256 public started; // start timestamp of vesting period
    IERC20 public immutable eywaToken; // the token you claim
    uint256 public cliffDuration; // timestamp cliff duration
    uint256 public stepDuration; // linear step duration
    uint256 public cliffAmount; // realeseble number of tokens after cliff

    uint256 public numOfSteps; // number of linear/discete steps

    IVestingPolicy public claimAllowanceContract;  // policy contract for permission for claim.
    uint256 claimWithAllowanceTimeStamp; // timestamp to claim without permission

    mapping(address => uint256) public claimed; // how much already claimed by address
    uint256 public vEywaInitialSupply; // initial total amount of vesting tokens

    // balance of tokens owners excluding burn tokens,
    // used for calculation right amount claimable tokens after transfer
    mapping(address => uint256) public unburnBalanceOf; 

    // permitted amount of token for token owner for trasnfer
    mapping(address => mapping(address => uint256)) public transferPermission;

    /**
     * @dev Emitted number released tokens after claim from the address.
     *
     */
    event ReleasedAfterClaim(address indexed from, uint256 indexed amount);

    constructor(IERC20 _eywaToken) ERC20("Vested Eywa", "vEYWA") {

        eywaToken = _eywaToken;
    }

    /**
     * @dev Initialize vesting parameters.
     *
      * Note can be used only once.
     */
    function initialize(
        IVestingPolicy _claimAllowanceContract,
        uint256 _claimWithAllowanceTimeStamp,
        uint256 _started,
        uint256 _cliffDuration,
        uint256 _stepDuration,
        uint256 _cliffAmount,
        uint256 _allStepsDuration,
        uint256 _permissionlessTimeStamp,
        address[] calldata _initialAddresses, // initial vesting tokens owners
        uint256[] calldata _initialSupplyAddresses // initial balances of vesting tokens owners
    ) external onlyOwner {
        require(started == 0, "Contract is already initialized");

        claimWithAllowanceTimeStamp = _claimWithAllowanceTimeStamp;
        claimAllowanceContract = _claimAllowanceContract;
        started = _started;
        cliffDuration = _cliffDuration;
        stepDuration = _stepDuration;
        cliffAmount = _cliffAmount;
        permissionlessTimeStamp = _permissionlessTimeStamp;

        for (uint256 i = 0; i < _initialAddresses.length; i++) {
            _mint(_initialAddresses[i], _initialSupplyAddresses[i]);
            vEywaInitialSupply = vEywaInitialSupply + _initialSupplyAddresses[i];
            unburnBalanceOf[_initialAddresses[i]] = _initialSupplyAddresses[i];
        }

        // Total steps of linear/discrete unlock.
        // Note: if there is a reminder, it can be claimed after (vesting period + 1sec)
        numOfSteps = _allStepsDuration / stepDuration; 
        // Lock original tokens on vesting contract.
        IERC20(eywaToken).safeTransferFrom(msg.sender, address(this), vEywaInitialSupply);
    }

    // Change IVestingPolicy contract
    function renounceClaimAllowanceContract(IVestingPolicy newConatract) external onlyOwner {
        claimAllowanceContract = newConatract;
    }

    // Returns amount of tokens permitted for claim
    function permittedAmountToClaim(address tokenOwner) public view returns (uint256) {
        return IVestingPolicy(claimAllowanceContract).permittedForClaim(tokenOwner);
    }

    // Returns number of tokens pertmittd to transfer from address 'from' to address 'to'
    function getCurrentTransferPermission(address from, address to) external view returns (uint256) {
        return transferPermission[from][to];
    }

    // Increase transfer permission number from address 'from' to address 'to'
    function increaseTransferPermission(
        address from,
        address to,
        uint256 amount
    ) external onlyOwner {
        transferPermission[from][to] = transferPermission[from][to].add(amount);
    }

    // Decrease transfer permission number from address 'from' to address 'to'
    function decreaseTransferPermission(
        address from,
        address to,
        uint256 amount
    ) external onlyOwner {
        transferPermission[from][to] = transferPermission[from][to].sub(amount);
    }

    // Available amount of tokens for tokenOwner at timestamp
    function available(uint256 time, address tokenOwner) public view returns (uint256) {
        if (claimable(time) >= vEywaInitialSupply) {
            return balanceOf(tokenOwner);
        }
        if (claimable(time).mul(unburnBalanceOf[tokenOwner]).div(vEywaInitialSupply) >= claimed[tokenOwner]) {
            return (claimable(time).mul(unburnBalanceOf[tokenOwner]).div(vEywaInitialSupply)).sub(claimed[tokenOwner]);
        } else {
            return 0;
        }
    }

    // Update data for correct calculation of available for claim tokens
    function updateUnburnBalanceAndClaimed(
        address sender,
        address recipient,
        uint256 amount
    ) private {
        uint256 claimedNumberTransfer = claimed[sender].mul(amount).div(unburnBalanceOf[sender]);
        uint256 remainderIncrease;
        if ((claimed[sender].mul(amount)).mod(unburnBalanceOf[sender]) > 0) {
            remainderIncrease = 1;
        }
        claimed[sender] = claimed[sender] - claimedNumberTransfer;
        claimed[recipient] = claimed[recipient] + claimedNumberTransfer + remainderIncrease;
        unburnBalanceOf[sender] = unburnBalanceOf[sender] - amount;
        unburnBalanceOf[recipient] = unburnBalanceOf[recipient] + amount;
    }

    // Total claimable sum by the time 
    // Note: do not consider number of released tokens
    function claimable(uint256 time) public view returns (uint256) {
        if (time == 0) {
            return 0;
        }
        if (time < started.add(cliffDuration)) {
            return 0;
        }
        uint256 passedSinceCliff = time.sub(started.add(cliffDuration));
        uint256 stepsPassed = Math.min(numOfSteps, passedSinceCliff.div(stepDuration));
        if (stepsPassed >= numOfSteps) {
            return vEywaInitialSupply;
        }
        return cliffAmount.add((vEywaInitialSupply.sub(cliffAmount)).mul(stepsPassed).div(numOfSteps));
    }

    // Claim number of tokens
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
        claimed[msg.sender] = claimed[msg.sender].add(claimedAmount);
        _burn(msg.sender, claimedAmount);
        IERC20(eywaToken).safeTransfer(msg.sender, claimedAmount);
        emit ReleasedAfterClaim(msg.sender, claimedAmount);
    }

    function transfer(address recipient, uint256 amount) public override nonReentrant returns (bool) {
        require(started <= block.timestamp, "It is not started time yet");
        bool result;
        if (block.timestamp < started + permissionlessTimeStamp) {
            require(amount <= transferPermission[msg.sender][recipient], "This early transfer doesn't have permission");
            transferPermission[msg.sender][recipient] = transferPermission[msg.sender][recipient].sub(amount);
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
            require(amount <= transferPermission[sender][recipient], "This early transfer doesn't have permission");
            transferPermission[sender][recipient] = transferPermission[sender][recipient].sub(amount);
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
