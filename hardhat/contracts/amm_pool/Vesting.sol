// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/utils/math/Math.sol";
import "@openzeppelin/contracts-newone/utils/math/SafeMath.sol";
import "@openzeppelin/contracts-newone/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-newone/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts-newone/utils/Counters.sol";

contract EywaVesting is ERC20, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    string constant prefix = "\x19Ethereum Signed Message:\n32"; 

    string public vestingName;
    address public immutable adminDeployer;
    address public earlyTransferPermissionAdmin; // address which can agree early transfer
    uint256 public permissionlessTimeStamp;
    uint256 public started; 
    IERC20 public immutable eywaToken;
    uint256 public cliffDuration; // timestamp cliff duration
    uint256 public stepDuration; // linear step duration
    uint256 public cliffAmount; // realeseble number of tokens after cliff
    uint256 public stepAmount; // realeseble number of tokens after 1 step
    uint256 public numOfSteps; // number of linear steps

    // mapping(address => Counters.Counter) private _nonces;
    mapping (address => uint256) public claimed; // how much already claimed
    uint256 public vEywaInitialSupply;
    mapping (address => uint256) public unburnBalanceOf;

    mapping(address => mapping(address => uint256)) public transferPermission;

    // bool internal isOriginal = true;

    event ReleasedAfterClaim(address indexed from, uint256 indexed amount);
    // event NewVestingContractCloned(address indexed vestingContract);

    constructor(string _vestingName, address _adminDeployer, IERC20 _eywaToken) ERC20("Vested Eywa", "vEYWA"){
        vestingName = _vestingName;
        adminDeployer = _adminDeployer;
        eywaToken = _eywaToken;
    }

    function initialize(
        uint256 _started,
        uint256 _cliffDuration,
        uint256 _stepDuration,
        uint256 _cliffAmount,
        uint256 _stepAmount,
        uint256 _numOfSteps,
        address _earlyTransferPermissionAdmin,
        uint256 _permissionlessTimeStamp,
        address[] calldata _initialAddresses,
        uint256[] calldata _initialSupplyAddresses
    ) external {
        require(adminDeployer == msg.sender, "Msg.sender is not admin");
        require(earlyTransferPermissionAdmin == address(0), "Contract is already initialized");
        require(_earlyTransferPermissionAdmin != address(0), "Zero address");

        started = _started;
        cliffDuration = _cliffDuration;
        stepDuration = _stepDuration;
        cliffAmount = _cliffAmount;
        stepAmount = _stepAmount;
        numOfSteps = _numOfSteps;
        earlyTransferPermissionAdmin = _earlyTransferPermissionAdmin;
        permissionlessTimeStamp = _permissionlessTimeStamp;

        for(uint256 i=0; i < _initialAddresses.length;i++){
            _mint(_initialAddresses[i], _initialSupplyAddresses[i]);
            vEywaInitialSupply = vEywaInitialSupply + _initialSupplyAddresses[i];
            unburnBalanceOf[_initialAddresses[i]] = _initialSupplyAddresses[i];
        }
        IERC20(eywaToken).safeTransferFrom(msg.sender, address(this), vEywaInitialSupply);
    }

    function getCurrentTransferPermission(address from, address to) external view returns(uint256) {
        return transferPermission[from][to];
    }

    function increaseTransferPermission(address from, address to, uint256 amount) external {
        require(msg.sender == earlyTransferPermissionAdmin, "msg.sender is not admin");
        transferPermission[from][to] = transferPermission[from][to].add(amount);
    }

    function decreaseTransferPermission(address from, address to, uint256 amount) external {
        require(msg.sender == earlyTransferPermissionAdmin, "msg.sender is not admin");
        transferPermission[from][to] = transferPermission[from][to].sub(amount);
    }

    function available(uint256 time, address tokenOwner) public view returns(uint256) {
        if(claimable(time) >= vEywaInitialSupply){
            return balanceOf(tokenOwner);
        }
        if(claimable(time).mul(unburnBalanceOf[tokenOwner]).div(vEywaInitialSupply) >= claimed[tokenOwner]){
            return (claimable(time).mul(unburnBalanceOf[tokenOwner]).div(vEywaInitialSupply)).sub(claimed[tokenOwner]);
        } else {
            return 0;
        }
    }

    function updateUnburnBalanceAndClaimed(address sender, address recipient, uint256 amount) private {
        uint256 claimedNumberTransfer = claimed[sender].mul(amount).div(unburnBalanceOf[sender]);
        uint256 remainderIncrease;
        if ((claimed[sender].mul(amount)).mod(unburnBalanceOf[sender]) > 0){
            remainderIncrease = 1;
        }
        claimed[sender] = claimed[sender] - claimedNumberTransfer;
        claimed[recipient] = claimed[recipient] + claimedNumberTransfer + remainderIncrease; 
        unburnBalanceOf[sender] = unburnBalanceOf[sender] - amount; 
        unburnBalanceOf[recipient] = unburnBalanceOf[recipient] + amount;
    }

    function claimable(uint256 time) public view returns(uint256) {
        if (time == 0) {
            return 0;
        }
        if (time < started.add(cliffDuration)){
            return 0;
        }
        uint256 passedSinceCliff = time.sub(started.add(cliffDuration));
        uint256 stepsPassed = Math.min(numOfSteps, passedSinceCliff.div(stepDuration));
        return cliffAmount.add(
            stepsPassed.mul(stepAmount)
        );
    }

    function claim(uint256 claimedAmount) external nonReentrant() {
        uint256 availableAmount = available(block.timestamp, msg.sender);
        require(claimedAmount > 0, "available amount is 0");
        require(availableAmount >= claimedAmount, "the amount is not available");
        claimed[msg.sender] = claimed[msg.sender].add(claimedAmount);
        _burn(msg.sender, claimedAmount);
        IERC20(eywaToken).safeTransfer(msg.sender, claimedAmount);
        emit ReleasedAfterClaim(msg.sender, claimedAmount);
    }

    function transfer(
        address recipient, 
        uint256 amount
    ) public override nonReentrant() returns (bool) {
        require(started <= block.timestamp, "It is not started time yet");
        bool result;
        if(block.timestamp < started + permissionlessTimeStamp){
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
    ) public override nonReentrant() returns (bool) {
        require(started <= block.timestamp, "It is not started time yet");
        bool result;
        if(block.timestamp < started + permissionlessTimeStamp){
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

