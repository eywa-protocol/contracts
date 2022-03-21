// // SPDX-License-Identifier: MIT
// pragma solidity 0.8.10;

// import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";
// import "@openzeppelin/contracts-newone/access/Ownable.sol";

// interface ILocalDepository {
//     function getAvailableBalance(address user) external returns(uint256);
// }

// contract GateKeeper is Ownable {
    
//     address localDepository;
//     mapping(address => bool) public pusher;

//     constructor(address _localDepository, address _pusher) {
//         localDepository = _localDepository;
//         _setPusher(_pusher);
//     }

//     modifier onlyPusher() {
//         require(pusher[_pusher], "GateKeeper: pusher only");
//         _;
//     }

//     function setPusher(address _pusher) public onlyOwner {
//         _setPusher(_pusher);
//     }

//     function _setPusher(address _pusher) internal {
//         pusher[_pusher] = true;
//     }

//     function proceedCall(
//         bytes calldata _callData,
//         address _receiveSide,
//         address _userFrom,
//         uint256 _executionPrice,
//         uint256 _timeout,
//         uint8[2] _v,
//         bytes32[2] _r,
//         bytes32[2] _s
//     ) public onlyPusher {
//         bytes32 structHash = keccak256(abi.encodePacked(_callData, _executionPrice, _userFrom, _msgSender(), _timeout));

//         address pusher = ECDSA.recover(ECDSA.toEthSignedMessageHash(structHash), _v[0], _r[0], _s[0]);
//         address sender = ECDSA.recover(ECDSA.toEthSignedMessageHash(structHash), _v[1], _r[1], _s[1]);

//         require(pusher[pusher], "GateKeeper: invalid signature from pusher");
//         require(sender == _userFrom, "GateKeeper: invalid signature from sender");

//         //take fee here
//         ILocalDepository(localDepository).getAvailableBalance(_userFrom);


//         bytes memory data = _receiveSide.functionCall(_callData, "GateKeeper: call failed");
//         require(
//             data.length == 0 || abi.decode(data, (bool)),
//             "GateKeeper: unable to decode returned data"
//         );
//     }
// }
