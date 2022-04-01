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

    address public immutable adminDeployer;
    address public signAdmin; // address which can sign early transfer
    uint256 public signatureTimeStamp;
    uint256 public started; 
    IERC20 public immutable eywaToken;
    uint256 public cliffDuration; // timestamp cliff duration
    uint256 public stepDuration; // linear step duration
    uint256 public cliffAmount; // realeseble number of tokens after cliff
    uint256 public stepAmount; // realeseble number of tokens after 1 step
    uint256 public numOfSteps; // number of linear steps

    mapping(address => Counters.Counter) private _nonces;
    mapping (address => uint256) public claimed; // how much already claimed
    uint256 public vEywaInitialSupply;
    mapping (address => uint256) public unburnBalanceOf;

    event ReleasedAfterClaim(address indexed from, uint256 indexed amount);

    constructor(address _adminDeployer, IERC20 _eywaToken) ERC20("Vested Eywa", "vEYWA"){
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
        address _signAdmin,
        uint256 _signatureTimeStamp,
        address[] calldata _initialAddresses,
        uint256[] calldata _initialSupplyAddresses
    ) external {
        require(adminDeployer == msg.sender, "Msg.sender is not admin");
        require(signAdmin == address(0), "Contract is already initialized");
        require(_signAdmin != address(0), "Zero address");

        started = _started;
        cliffDuration = _cliffDuration;
        stepDuration = _stepDuration;
        cliffAmount = _cliffAmount;
        stepAmount = _stepAmount;
        numOfSteps = _numOfSteps;
        signAdmin = _signAdmin;
        signatureTimeStamp = _signatureTimeStamp;

        for(uint256 i=0; i < _initialAddresses.length;i++){
            _mint(_initialAddresses[i], _initialSupplyAddresses[i]);
            vEywaInitialSupply = vEywaInitialSupply + _initialSupplyAddresses[i];
            unburnBalanceOf[_initialAddresses[i]] = _initialSupplyAddresses[i];
        }
        IERC20(eywaToken).safeTransferFrom(msg.sender, address(this), vEywaInitialSupply);
    }

    function nonces(address owner) public view returns (uint256) {
        return _nonces[owner].current();
    }

    function _useNonce(address owner) internal returns (uint256 current) {
        Counters.Counter storage nonce = _nonces[owner];
        current = nonce.current();
        nonce.increment();
    }

    function checkSignature(
        address sender, 
        address recipient, 
        uint256 amount,
        uint8 v, 
        bytes32 r, 
        bytes32 s
        ) private {
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, 
            keccak256(abi.encodePacked(
                keccak256(abi.encodePacked(sender)), 
                keccak256(abi.encodePacked(recipient)),
                keccak256(abi.encodePacked(_useNonce(sender))), 
                keccak256(abi.encodePacked(amount)) 
            ))
        ));
        require(ecrecover(prefixedHash, v, r, s) == signAdmin, "ERROR: Verifying signature failed");
    }

    function available(uint256 time, address tokenOwner) public view returns(uint256) {
        return (claimable(time).mul(unburnBalanceOf[tokenOwner]).div(vEywaInitialSupply)).sub(claimed[tokenOwner]);
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
        uint256 claimableAmount = claimable(block.timestamp);
        if(claimableAmount >= vEywaInitialSupply && balanceOf(msg.sender) >= claimedAmount) {
            _burn(msg.sender, claimedAmount);
            IERC20(eywaToken).safeTransfer(msg.sender, claimedAmount);
            return;
        }
        uint256 availableAmount = available(block.timestamp, msg.sender);
        require(claimedAmount > 0, "available amount is 0");
        require(availableAmount >= claimedAmount, "the amount is not available");
        claimed[msg.sender] = claimed[msg.sender].add(claimedAmount);
        _burn(msg.sender, claimedAmount);
        IERC20(eywaToken).safeTransfer(msg.sender, claimedAmount);
        emit ReleasedAfterClaim(msg.sender, claimedAmount);
    }

    function updateUnburnBalanceAndClaimed(address sender, address recipient, uint256 amount) private {
        uint256 claimedNumberTransfer = claimed[sender].mul(amount).div(unburnBalanceOf[sender]);
        unburnBalanceOf[sender] = unburnBalanceOf[sender] - amount; 
        unburnBalanceOf[recipient] = unburnBalanceOf[recipient] + amount;
        claimed[sender] = claimed[sender] - claimedNumberTransfer;
        claimed[recipient] = claimed[recipient] + claimedNumberTransfer; 
    }

    function transferWithSignature(
        address recipient, 
        uint256 amount,  
        uint8 v, 
        bytes32 r, 
        bytes32 s 
    ) public nonReentrant() returns (bool) {
        require(started <= block.timestamp, "It is not started time yet");
        checkSignature(msg.sender, recipient, amount, v, r, s);
        updateUnburnBalanceAndClaimed(msg.sender, recipient, amount);
        bool result = super.transfer(recipient, amount);
        return result;
    }

    function transfer(
        address recipient, 
        uint256 amount
    ) public override nonReentrant() returns (bool) {
        require(block.timestamp >= started + signatureTimeStamp);
        updateUnburnBalanceAndClaimed(msg.sender, recipient, amount);
        bool result = super.transfer(recipient, amount);
        return result;
    }
    
    function transferFromWithSignature(
        address sender, 
        address recipient, 
        uint256 amount, 
        uint8 v, 
        bytes32 r, 
        bytes32 s
    ) public nonReentrant() returns (bool) {
        checkSignature(sender, recipient, amount, v, r, s);
        updateUnburnBalanceAndClaimed(sender, recipient,  amount);
        bool result = super.transferFrom(sender, recipient, amount);
        return result;
    }

    function transferFrom(
        address sender, 
        address recipient, 
        uint256 amount
    ) public override nonReentrant() returns (bool) {
        require(block.timestamp >= started + signatureTimeStamp);
        updateUnburnBalanceAndClaimed(sender, recipient, amount);
        bool result = super.transferFrom(sender, recipient, amount);
        return result;
    }
}