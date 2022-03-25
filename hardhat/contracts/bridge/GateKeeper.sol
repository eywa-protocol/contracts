// // SPDX-License-Identifier: MIT
// pragma solidity 0.8.10;

// import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";
// import "@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts-newone/access/Ownable.sol";
// import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts-newone/utils/Address.sol";

// interface ILocalTreasury {
//     function deposit(address token) external;
// }

// contract GateKeeper is Ownable {
//     using Address for address;

//     address localTreasury;
//     mapping(address => bool) public pusher;

//     // uint256 public basePercent = 1000; //10%
    
//     // constructor(address _localTreasury) {
//     //     localTreasury = _localTreasury;
//     // }

//     function setPusher(address _pusher) public onlyOwner {
//         _setPusher(_pusher);
//     }

//     function _setPusher(address _pusher) internal {
//         pusher[_pusher] = true;
//     }

//     // function getTxValues(uint256 amount)
//     //     public
//     //     view
//     //     returns (uint256 executionPrice, uint256 txFee)
//     // {
//     //     // require(amount >= 10, "transfer amount is too small");
//     //     txFee = (amount * basePercent) / 10000;
//     //     executionPrice = amount - txFee;
//     //     return (executionPrice, txFee);
//     // }

//     function proceedCall(
//         bytes memory _callData,
//         address _payToken,
//         address _receiveSide,
//         address _userFrom,
//         uint256 _executionPrice,
//         uint256 _timeout,
//         uint8[2] memory _v,
//         bytes32[2] memory _r,
//         bytes32[2] memory _s
//     ) public {
//         bytes32 structHash = keccak256(abi.encodePacked(_callData, _executionPrice, _userFrom, _msgSender(), _timeout));

//         address worker = ECDSA.recover(ECDSA.toEthSignedMessageHash(structHash), _v[0], _r[0], _s[0]);
//         address sender = ECDSA.recover(ECDSA.toEthSignedMessageHash(structHash), _v[1], _r[1], _s[1]);

//         require(pusher[worker], "GateKeeper: invalid signature from worker");
//         require(sender == _userFrom, "GateKeeper: invalid signature from sender");

//         //take fee here
//         // (uint256 executionPrice, uint256 txFee) = getTxValues(_executionPrice);
//         // SafeERC20.safeTransfer(IERC20(_payToken), localTreasury, txFee);
//         // ILocalTreasury(localTreasury).deposit(_payToken);    <--

//         IERC20(_payToken).approve(_receiveSide, executionPrice);
//         bytes memory data = _receiveSide.functionCall(_callData, "GateKeeper: call failed");
//         require(
//             data.length == 0 || abi.decode(data, (bool)),
//             "GateKeeper: unable to decode returned data"
//         );
//     }



// }
