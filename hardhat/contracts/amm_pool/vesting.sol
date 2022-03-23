// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/utils/math/Math.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/utils/math/SafeMath.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";

contract EywaVesting is ERC20, ReentrancyGuard {
    using SafeMath for uint256;

    address private signAdmin; // address which can sign early transfer
    uint256 public signatureTimeStamp;
    
    uint256 public immutable started; // timestamp start
    IERC20 public immutable eywaToken;
    uint256 public immutable cliffDuration; // timestamp cliff duration
    uint256 public immutable stepDuration; // linear step duration
    uint256 public immutable cliffAmount; // realeseble number of tokens after cliff
    uint256 public immutable stepAmount; // realeseble number of tokens after 1 step
    uint256 public immutable numOfSteps; // number of linear steps

    mapping (address => uint256) public claimed; // how much already claimed
    mapping(bytes32 => bool) private usedNonces;
    uint256 public vEywaInitialSupply;

    constructor(
        IERC20 _eywaToken,
        uint256 _started,
        uint256 _cliffDuration,
        uint256 _stepDuration,
        uint256 _cliffAmount,
        uint256 _stepAmount,
        uint256 _numOfSteps,
        address _signAdmin,
        uint256 _signatureTimeStamp,
        address[] _initialAddresses,
        address[] _initialSupplyAddresses

    ) {
        eywaToken = _eywaToken;
        started = _started;
        cliffDuration = _cliffDuration;
        stepDuration = _stepDuration;
        cliffAmount = _cliffAmount;
        stepAmount = _stepAmount;
        numOfSteps = _numOfSteps;
        signAdmin = _signAdmin;
        signatureTimeStamp = _signatureTimeStamp;

        for(i=0; i < len(initialAddresses);i++){
            _mint(_initialAddresses[i], _initialSupplyAddresses[i]);
            vEywaInitialSupply = vEywaInitialSupply + _initialSupplyAddresses[i];
        }
        SafeERC20.safeTransferFrom(eywaToken, msg.sender, address(this), vEywaInitialSupply);
    }


    function available(uint256 time, address tokenOwner) public view returns(uint256) {
        return claimable(time).mul(balanceOf(tokenOwner) / vEywaInitialSupply).sub(claimed[tokenOwner]);

    }

    // returns number of claimable tokens by this time
    function claimable(uint256 time) public view returns(uint256) {
        if (time == 0) {
            return 0;
        }
        // cliffAmount +  stepAmount * min((time - (started + cliffDuration))/stepDuration, numOfSteps)
        uint256 passedSinceCliff = time.sub(started.add(cliffDuration));
        uint256 stepsPassed = Math.min(numOfSteps, passedSinceCliff.div(stepDuration));
        return cliffAmount.add(
            stepsPassed.mul(stepAmount)
        );
    }

    function claim(uint256 claimedAmount) external nonReentrant() {
        uint256 claimableAmount = claimable(block.timestamp);
        if (claimable >= vEywaInitialSupply && balanceOf(msg.sender) >= claimedAmount) {
            _burn(msg.sender, claimedAmount);
            SafeERC20.safeTransferFrom(eywaToken, address(this), msg.sender, claimedAmount);
        }
        uint256 availableAmount = available(block.timestamp, msg.sender);
        require(claimedAmount > 0, "available amount is 0");
        require(availableAmount >= claimedAmount, "the amount is not available");
        claimed[msg.sender] = claimed[msg.sender].add(claimedAmount);
        _burn(msg.sender, claimedAmount);
        SafeERC20.safeTransferFrom(eywaToken, address(this), msg.sender, claimedAmount);
    }

    function isNonceUsed(bytes32 nonce) public view returns (bool) {
        return usedNonces[nonce];
    }

    function transfer(address recipient, uint256 amount,  uint8 v, bytes32 r, bytes32 s, bytes32 nonce) external override returns (bool) {
        require(usedNonces[nonce] == false);
        usedNonces[nonce] = true;
        string memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, keccak256(abi.encodePacked(msg.sender)), keccak256(abi.encodePacked(recipient)),  keccak256(abi.encodePacked(amount))));
        require(ecrecover(prefixedHash, v, r, s) == signAdmin, "ERROR: Verifying signature failed");

        uint256 memory claimedNumberTransfer = claimed[msg.sender].mul(amount).div(balanceOf(msg.sender));
        claimed[msg.sender] = claimed[msg.sender] - claimedNumberTransfer;
        claimed[recipient] = claimedNumberTransfer;
        bool result = super.transfer(recipient, amount);
        return result;
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        require(block.timestamp >= started + signatureTimeStamp);

        uint256 memory claimedNumberTransfer = claimed[msg.sender].mul(amount).div(balanceOf(msg.sender));
        claimed[msg.sender] = claimed[msg.sender] - claimedNumberTransfer;
        claimed[recipient] = claimedNumberTransfer;
        bool result = super.transfer(recipient, amount);
        return result;
    }

    function transferFrom(address sender, address recipient, uint256 amount, uint8 v, bytes32 r, bytes32 s, bytes32 nonce) external override nonReentrant() returns (bool) {
        require(usedNonces[nonce] == false);
        usedNonces[nonce] = true;
        string memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, keccak256(abi.encodePacked(sender)), keccak256(abi.encodePacked(recipient)),  keccak256(abi.encodePacked(amount))));
        require(ecrecover(prefixedHash, v, r, s) == signAdmin, "ERROR: Verifying signature failed");

        uint256 memory claimedNumberTransfer = claimed[msg.sender].mul(amount).div(balanceOf(msg.sender));
        claimed[sender] = claimed[msg.sender] - claimedNumberTransfer;
        claimed[recipient] = claimedNumberTransfer;
        bool result = super.transferFrom(sender, recipient, amount);
        return result;
    }


    function transferFrom(address sender, address recipient, uint256 amount) external override nonReentrant() returns (bool) {
        require(block.timestamp >= started + signatureTimeStamp);
        
        uint256 memory claimedNumberTransfer = claimed[msg.sender].mul(amount).div(balanceOf(msg.sender));
        claimed[sender] = claimed[msg.sender] - claimedNumberTransfer;
        claimed[recipient] = claimedNumberTransfer;
        bool result = super.transferFrom(sender, recipient, amount);
        return result;
    }
}