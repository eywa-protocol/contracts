// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";


contract VestingEscrow is ERC20, ReentrancyGuard {
    IERC20 public immutable eywaToken;

    address private signAdmin;

    uint256 private startTime; // timestamp
    uint256 private endTime; // timestampx
    uint256 private signatureCliff; // timestamp
    uint256 private cliff; // timestamp TODO: not cliff
    uint256 private cliffBasePercent; // percent to unlock on cliff time
    uint256 private epochDuration; // epoch duration in seconds
    uint256 private epochPercent;

    uint256 totalEpochNumber;
    // uint256 epochReleaseAmount;
    // uint256 cliffUnlockAmount;

    uint256 totalReleased;

    uint256 currentEpoch; //TODO: get current epoch

    mapping(bytes32 => bool) private usedNonces;

    mapping(address => uint256) private currentEpochNumber;

    // mapping(address => uint256) private currentEpochNumber;
    // mappa address => canRasreleasedNumber
    // transfer 

    // TODO if else если все эпохи пройдены все снять

    constructor(
        IERC20 _EywaToken, 
        address _signAdmin,
        uint256 _startTime, 
        uint256 _endTime,
        uint256 _signatureCliff,
        uint256 _cliff,
        uint256 _cliffBasePercent,
        uint256 _epochDuration,
        uint256 _epochPercent,
        address[] _initialAddresses,
        address[] _initialSupplyAddresses
        ) ERC20("EYWA Token (Vested)", "vEYWA") {
        require(len(_initialAddresses)==len(_initialSupplyAddresses), "Length of arrays not the same");
                    
        eywaToken = _EywaToken;
        signAdmin = _signAdmin;

        startTime = _startTime; 
        endTime = _endTime; 
        signatureCliff = _signatureCliff; 
        cliff = _cliff; 
        cliffBasePercent = _cliffBasePercent; 
        epochDuration = _epochDuration; 
        epochPercent = _epochPercent;

        totalEpochNumber = startTime - endTime / epochDuration;
        // epochReleaseAmount = totalSupply / _totalEpochNumber;
        // cliffUnlockAmount = totalSupply * cliffBasePercent / 10000;
        cliff = _cliff;
        SafeERC20.safeTransferFrom(eywaToken, msg.sender, address(this), vEywaSupply);
        for(i=0; i < len(initialAddresses);i++){
            _mint(_initialAddresses[i], _initialSupplyAddresses[i]);
        }
        // require(totalSupply()==_EywaToken.totalSupply());
    }

    function realeseTokens(address tokensOwner) public nonReentrant() returns (bool) {
        // require(balanceOf(tokensOwner) > 0);
        if(balanceOf(tokensOwner) == 0){
            return true;
        }
        uint256 memory currentEpoch;
        if(cliff + startTime <= block.timestamp) {
            currentEpoch = currentEpoch + 1;
            uint256 epochCount = (block.timestamp - (cliff + startTime)) / epochDuration;
            if(epochCount >= 1){
                currentEpoch = currentEpoch + epochCount;
            }
        }

        if(block.timestamp >= endTime) {
            currentEpochNumber[tokensOwner] = totalEpochNumber;
            uint256 eywaAmount = balanceOf(tokensOwner);
            if(eywaAmount > 0){
                _burn(tokensOwner, eywaAmount);
                SafeERC20.safeTransferFrom(eywaToken, address(this), tokensOwner, eywaAmount);
            }
        }

        if(currentEpochNumber[tokensOwner] == 0 && currentEpoch == 1){
            currentEpochNumber[tokensOwner] = 1;
            require(_cliffBasePercent <= 100);
            uint256 eywaAmount = balanceOf(tokensOwner) * _cliffBasePercent / 100;
            if(eywaAmount > 0){
                _burn(tokensOwner, eywaAmount);
                SafeERC20.safeTransferFrom(eywaToken, address(this), tokensOwner, eywaAmount);
            }
            return true;
        }
        
        if(currentEpochNumber[tokensOwner] == 0 && currentEpoch > 1){
            currentEpochNumber[tokensOwner] = currentEpoch;
            require((_cliffBasePercent + (currentEpoch - 1)*epochPercent) <= 100);
            uint256 eywaAmount = balanceOf(tokensOwner) * (_cliffBasePercent + (currentEpoch - 1) * epochPercent) / 100;
            if(eywaAmount > 0){
                _burn(tokensOwner, eywaAmount);
                SafeERC20.safeTransferFrom(eywaToken, address(this), tokensOwner, eywaAmount);
            }
            return true;
        }

        if(currentEpochNumber[tokensOwner] == 1 && currentEpoch > 1){
            currentEpochNumber[tokensOwner] = currentEpoch;
            require(((currentEpoch - 1)*epochPercent) <= 100);
            uint256 eywaAmount = balanceOf(tokensOwner) * ((currentEpoch - 1) * epochPercent) / 100;
            if(eywaAmount > 0){
                _burn(tokensOwner, eywaAmount);
                SafeERC20.safeTransferFrom(eywaToken, address(this), tokensOwner, eywaAmount);
            }
            return true;
        }

        if(currentEpochNumber[tokensOwner] > 1 && currentEpoch > 1 && currentEpochNumber[tokensOwner] < currentEpoch){
            require(((currentEpoch - currentEpochNumber[tokensOwner])*epochPercent) <= 100);
            uint256 eywaAmount = balanceOf(tokensOwner) * ((currentEpoch - currentEpochNumber[tokensOwner])*epochPercent) / 100;
            currentEpochNumber[tokensOwner] = currentEpoch;
            if(eywaAmount > 0){
                _burn(tokensOwner, eywaAmount);
                SafeERC20.safeTransferFrom(eywaToken, address(this), tokensOwner, eywaAmount);
            }
            return true;
        }
        return true;
    }

    function approve(address spender, uint256 amount) external override nonReentrant() returns (bool) {
        require(block.timestamp >= startTime + signatureCliff);
        bool result = super.approve(sender, recipient, amount);
        return result;
    }

    function approve(address spender, uint256 amount, uint8 v, bytes32 r, bytes32 s, uint256 nonce) external override nonReentrant() returns (bool) {
        require(usedNonces[nonce] == false);
        usedNonces[nonce] = true;
        string memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, keccak256(abi.encodePacked(spender)),  keccak256(abi.encodePacked(amount))));
        require(ecrecover(prefixedHash, v, r, s) == signAdmin, "ERROR: Verifying signature failed");
        bool result = super.approve(sender, recipient, amount);
        return result;
    }

    // if msg.sender is not owner of vEywa
    function transferFrom(address sender, address recipient, uint256 amount) external override nonReentrant() returns (bool) {
        require(block.timestamp >= startTime + signatureCliff);
        realeseTokens(sender);
        realeseTokens(recipient);
        require(block.timestamp >= cliff);
        if (msg.sender == sender) {
            require(block.timestamp >= publicCliff, "you are owner and you should use transfer() function");
        }
        bool result = super.transferFrom(sender, recipient, amount);
        return result;
    }

    // if msg.sender is owner of vEywa
    function transferFrom(address sender, address recipient, uint256 amount, uint8 v, bytes32 r, bytes32 s, bytes32 nonce) external override nonReentrant() returns (bool) {
        realeseTokens(sender);
        realeseTokens(recipient);
        require(usedNonces[nonce] == false);
        usedNonces[nonce] = true;
        // TODO: seach openzep or do library
        string memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, keccak256(abi.encodePacked(sender)), keccak256(abi.encodePacked(recipient)),  keccak256(abi.encodePacked(amount))));
        require(ecrecover(prefixedHash, v, r, s) == signAdmin, "ERROR: Verifying signature failed");

        bool result = super.transferFrom(sender, recipient, amount);
        return result;
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        require(block.timestamp >= startTime + signatureCliff);
        realeseTokens(msg.sender);
        realeseTokens(recipient);
        bool result = super.transfer(recipient, amount);
        return result;
    }

    function transfer(address recipient, uint256 amount,  uint8 v, bytes32 r, bytes32 s, bytes32 nonce) external override returns (bool) {
        realeseTokens(msg.sender);
        realeseTokens(recipient);
        string memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, keccak256(abi.encodePacked(msg.sender)), keccak256(abi.encodePacked(recipient)),  keccak256(abi.encodePacked(amount))));
        require(ecrecover(prefixedHash, v, r, s) == signAdmin, "ERROR: Verifying signature failed");

        bool result = super.transfer(recipient, amount);
        return result;
    }


    function decreaseAllowance(address spender, uint256 subtractedValue, uint8 v, bytes32 r, bytes32 s, bytes32 nonce) external override nonReentrant() returns (bool) {
        require(usedNonces[nonce] == false);
        usedNonces[nonce] = true;
        string memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, keccak256(abi.encodePacked(spender)), keccak256(abi.encodePacked(subtractedValue))));
        
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external override nonReentrant() returns (bool) {
        require(block.timestamp >= startTime + signatureCliff);
        bool result = super.decreaseAllowance(spender, subtractedValue);
        return result;
    }

   function increaseAllowance(address spender, uint256 addedValue, uint8 v, bytes32 r, bytes32 s, bytes32 nonce) external override nonReentrant() returns (bool) {
        require(usedNonces[nonce] == false);
        usedNonces[nonce] = true;
        string memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, keccak256(abi.encodePacked(spender)), keccak256(abi.encodePacked(addedValue))));
        
    }

    function increaseAllowance(address spender, uint256 addedValue) external override nonReentrant() returns (bool) {
        require(block.timestamp >= startTime + signatureCliff);
        bool result = super.decreaseAllowance(spender, addedValue);
        return result;
    }


    function isNonceUsed(bytes32 nonce) public view returns (bool) {
        return usedNonces[nonce];
    }
    

}