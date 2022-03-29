// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/utils/math/Math.sol";
import "@openzeppelin/contracts-newone/utils/math/SafeMath.sol";
import "@openzeppelin/contracts-newone/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-newone/security/ReentrancyGuard.sol";

contract EywaVesting is ERC20, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    string constant prefix = "\x19Ethereum Signed Message:\n32";  

    address private immutable adminDeployer;

    address private signAdmin; // address which can sign early transfer

    uint256 public signatureTimeStamp;
    
    uint256 public started; // timestamp start
    IERC20 public eywaToken;
    uint256 public cliffDuration; // timestamp cliff duration
    uint256 public stepDuration; // linear step duration
    uint256 public cliffAmount; // realeseble number of tokens after cliff
    uint256 public stepAmount; // realeseble number of tokens after 1 step
    uint256 public numOfSteps; // number of linear steps

    mapping (address => uint256) public claimed; // how much already claimed
    mapping(uint256 => bool) private usedNonces;
    uint256 public vEywaInitialSupply;

    mapping (address => uint256) public unburnBalanceOf;

    event ReleasedAfterClaim(address indexed from, uint256 indexed amount);

    constructor(address _adminDeployer) ERC20("Vested Eywa", "vEYWA")
    {
        require(_adminDeployer != address(0), "Zero address");
        adminDeployer = _adminDeployer;
    }

    function initialize(
        IERC20 _eywaToken,
        uint256 _started,
        uint256 _cliffDuration,
        uint256 _stepDuration,
        uint256 _cliffAmount,
        uint256 _stepAmount,
        uint256 _numOfSteps,
        address _signAdmin,
        uint256 _signatureTimeStamp,
        address[] memory _initialAddresses,
        uint256[] memory _initialSupplyAddresses
    ) external {
        require(adminDeployer == msg.sender, "Msg.sender is not admin");
        require(signAdmin == address(0), "Contract is already initialized");
        require(_signAdmin != address(0), "Zero address");

        eywaToken = _eywaToken;
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


    function available(uint256 time, address tokenOwner) public view returns(uint256) {
        return (claimable(time).mul(unburnBalanceOf[tokenOwner]).div(vEywaInitialSupply)).sub(claimed[tokenOwner]);
        // return (claimable(time).mul(balanceOf(tokenOwner)).div(vEywaInitialSupply)).sub(claimed[tokenOwner]);
    }

    // returns number of claimable tokens by this time
    function claimable(uint256 time) public view returns(uint256) {
        if (time == 0) {
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
            // SafeERC20.safeTransferFrom(eywaToken, address(this), msg.sender, claimedAmount);
            // IERC20(eywaToken).safeTransferFrom(address(this), msg.sender, claimedAmount);
            IERC20(eywaToken).safeTransfer(msg.sender, claimedAmount);
            return;
        }
        uint256 availableAmount = available(block.timestamp, msg.sender);
        require(claimedAmount > 0, "available amount is 0");
        require(availableAmount >= claimedAmount, "the amount is not available");
        claimed[msg.sender] = claimed[msg.sender].add(claimedAmount);
        _burn(msg.sender, claimedAmount);
        // IERC20(eywaToken).safeTransferFrom(address(this), msg.sender, claimedAmount);
        IERC20(eywaToken).safeTransfer(msg.sender, claimedAmount);
        emit ReleasedAfterClaim(msg.sender, claimedAmount);
    }

    function isNonceUsed(uint256 nonce) public view returns (bool) {
        return usedNonces[nonce];
    }

    function transfer(address recipient, uint256 amount,  uint8 v, bytes32 r, bytes32 s, uint256 nonce) public returns (bool) {
        require(usedNonces[nonce] == false, "Nonce was used");
        require(started <= block.timestamp, "It is not started time yet");
        usedNonces[nonce] = true;
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, 
            keccak256(abi.encodePacked(
                keccak256(abi.encodePacked(msg.sender)), 
                keccak256(abi.encodePacked(recipient)),
                keccak256(abi.encodePacked(nonce)), 
                keccak256(abi.encodePacked(amount)) 
            ))
        ));
        require(ecrecover(prefixedHash, v, r, s) == signAdmin, "ERROR: Verifying signature failed");

        

        // TODO:
        // claimed[msg.sender] * amount  / balanceOf(msg.sender)
        // uint256 claimedNumberTransfer = claimed[msg.sender].mul(amount).div(balanceOf(msg.sender));
        uint256 claimedNumberTransfer = claimed[msg.sender].mul(amount).div(unburnBalanceOf[msg.sender]);
        unburnBalanceOf[msg.sender] = unburnBalanceOf[msg.sender] - amount; 
        unburnBalanceOf[recipient] = unburnBalanceOf[recipient] + amount;

        claimed[msg.sender] = claimed[msg.sender] - claimedNumberTransfer;
        claimed[recipient] = claimed[recipient] + claimedNumberTransfer;
        bool result = super.transfer(recipient, amount);
        return result;
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(block.timestamp >= started + signatureTimeStamp);

        // uint256 claimedNumberTransfer = claimed[msg.sender].mul(amount).div(balanceOf(msg.sender));
        uint256 claimedNumberTransfer = claimed[msg.sender].mul(amount).div(unburnBalanceOf[msg.sender]);
        unburnBalanceOf[msg.sender] = unburnBalanceOf[msg.sender] - amount; 
        unburnBalanceOf[recipient] = unburnBalanceOf[recipient] + amount;

        claimed[msg.sender] = claimed[msg.sender] - claimedNumberTransfer;
        claimed[recipient] = claimed[recipient] + claimedNumberTransfer;
        bool result = super.transfer(recipient, amount);
        return result;
    }
    // function transferFrom(address sender, address recipient, uint256 amount, uint8 v, bytes32 r, bytes32 s, bytes32 nonce) public nonReentrant() returns (bool) {
    function transferFrom(address sender, address recipient, uint256 amount, uint8 v, bytes32 r, bytes32 s, uint256 nonce) public nonReentrant() returns (bool) {

        require(usedNonces[nonce] == false, "Nonce was used");
        require(started <= block.timestamp, "It is not started time yet");
        usedNonces[nonce] = true;
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, 
            keccak256(abi.encodePacked(
                keccak256(abi.encodePacked(sender)), 
                keccak256(abi.encodePacked(recipient)),
                keccak256(abi.encodePacked(nonce)), 
                keccak256(abi.encodePacked(amount)) 
            ))
        ));
        require(ecrecover(prefixedHash, v, r, s) == signAdmin, "ERROR: Verifying signature failed");

        // uint256 claimedNumberTransfer = claimed[sender].mul(amount).div(balanceOf(sender));
        uint256 claimedNumberTransfer = claimed[sender].mul(amount).div(unburnBalanceOf[sender]);
        unburnBalanceOf[sender] = unburnBalanceOf[sender] - amount; 
        unburnBalanceOf[recipient] = unburnBalanceOf[recipient] + amount;

        claimed[sender] = claimed[sender] - claimedNumberTransfer;
        claimed[recipient] = claimed[recipient] + claimedNumberTransfer;
        bool result = super.transferFrom(sender, recipient, amount);
        return result;
    }


    function transferFrom(address sender, address recipient, uint256 amount) public override nonReentrant() returns (bool) {
        require(block.timestamp >= started + signatureTimeStamp);

        // uint256 claimedNumberTransfer = claimed[sender].mul(amount).div(balanceOf(sender));
        uint256 claimedNumberTransfer = claimed[sender].mul(amount).div(unburnBalanceOf[sender]);
        unburnBalanceOf[sender] = unburnBalanceOf[sender] - amount; 
        unburnBalanceOf[recipient] = unburnBalanceOf[recipient] + amount;

        claimed[sender] = claimed[sender] - claimedNumberTransfer;
        claimed[recipient] = claimed[recipient] + claimedNumberTransfer;
        bool result = super.transferFrom(sender, recipient, amount);
        return result;
    }
}