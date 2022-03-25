// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-newone/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-newone/utils/Address.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";

interface IPortal {
    function synthesize(
        address _token,
        uint256 _amount,
        address _from,
        address _to,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID
    ) external;
}

contract Router {
    using Address for address;

    address localTreasury;
    address portal;
    mapping(address => bool) public pusher;

    event PaymentEvent(address indexed userFrom, address payToken, uint256 executionPrice, address indexed worker);

    struct DelegatedCallReceipt {
        uint256 executionPrice;
        uint256 timeout;
        uint8[2] v;
        bytes32[2] r;
        bytes32[2] s;
    }

    constructor(
        /*address _localTreasury*/
        address _portal
    ) {
        // localTreasury = _localTreasury;
        portal = _portal;
    }

    // uint256 public basePercent = 1000; //10%
    // function setFee(uint256 _bp) public onlyOwner{
    //     basePercent = _bp;
    // }

    // function getTxValues(uint256 amount) public view returns (uint256 executionPrice, uint256 txFee) {
    //     // require(amount >= 10, "transfer amount is too small");
    //     txFee = (amount * basePercent) / 10000;
    //     executionPrice = amount - txFee;
    //     return (executionPrice, txFee);
    // }

    // function proceedCallWithTokenTransfer(
    //     bytes memory _callData,
    //     address _token,
    //     uint256 _amount,
    //     address _userFrom,
    //     address _receiveSide
    // ) public {
    //     // proceed amount
    //     SafeERC20.safeTransferFrom(IERC20(_token), _userFrom, _receiveSide, _amount);

    //     bytes memory data = _receiveSide.functionCall(_callData, "Router: call failed");
    //     require(data.length == 0 || abi.decode(data, (bool)), "Router: unable to decode returned data");
    // }

    // function proceedDelegatedCallWithTokenTransfer(
    //     bytes memory _callData,
    //     address _payToken,
    //     uint256 _transferAmount,
    //     address _userFrom,
    //     address _receiveSide,
    //     uint256 _executionPrice,
    //     uint256 _timeout,
    //     uint8[2] memory _v,
    //     bytes32[2] memory _r,
    //     bytes32[2] memory _s
    // ) public {
    //     bytes32 structHash = keccak256(
    //         abi.encodePacked(_callData, _payToken, _executionPrice, _userFrom, msg.sender, _timeout)
    //     );

    //     address worker = ECDSA.recover(ECDSA.toEthSignedMessageHash(structHash), _v[0], _r[0], _s[0]);
    //     address sender = ECDSA.recover(ECDSA.toEthSignedMessageHash(structHash), _v[1], _r[1], _s[1]);

    //     require(pusher[worker], "GateKeeper: invalid signature from worker");
    //     require(sender == _userFrom, "GateKeeper: invalid signature from sender");

    //     // (uint256 executionPrice, uint256 txFee) = getTxValues(_executionPrice);

    //     // worker fee
    //     SafeERC20.safeTransferFrom(IERC20(_payToken), _userFrom, msg.sender, _executionPrice);
    //     // proceed amount
    //     SafeERC20.safeTransferFrom(IERC20(_payToken), _userFrom, _receiveSide, _transferAmount);

    //     emit PaymentEvent(_userFrom, _payToken, _executionPrice, worker);

    //     bytes memory data = _receiveSide.functionCall(_callData, "Router: call failed");
    //     require(data.length == 0 || abi.decode(data, (bool)), "Router: unable to decode returned data");
    // }

    function delegatedTokenSynthesize(
        address _token,
        uint256 _amount,
        address _from,
        address _to,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID,
        DelegatedCallReceipt memory _receipt
    ) external {
        bytes32 structHash = keccak256(
            abi.encodePacked(_token, _receipt.executionPrice, _from, msg.sender, _receipt.timeout)
        );

        address worker = ECDSA.recover(
            ECDSA.toEthSignedMessageHash(structHash),
            _receipt.v[0],
            _receipt.r[0],
            _receipt.s[0]
        );
        address sender = ECDSA.recover(
            ECDSA.toEthSignedMessageHash(structHash),
            _receipt.v[1],
            _receipt.r[1],
            _receipt.s[1]
        );

        require(pusher[worker], "GateKeeper: invalid signature from worker");
        require(sender == _from, "GateKeeper: invalid signature from sender");

        // (uint256 executionPrice, uint256 txFee) = getTxValues(_executionPrice);   <--

        // worker fee
        SafeERC20.safeTransferFrom(IERC20(_token), _from, msg.sender, _receipt.executionPrice);
        // proceed amount
        SafeERC20.safeTransferFrom(IERC20(_token), _from, portal, _amount - _receipt.executionPrice);

        emit PaymentEvent(_from, _token, _receipt.executionPrice, worker);

        IPortal(portal).synthesize(_token, _amount, _from, _to, _receiveSide, _oppositeBridge, _chainID);
    }

    function delegatedTokenSynthesize1(
        address _token,
        uint256 _amount,
        address _from,
        address _to,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID
    ) external {
        SafeERC20.safeTransferFrom(IERC20(_token), _from, portal, _amount);
        IPortal(portal).synthesize(_token, _amount, _from, _to, _receiveSide, _oppositeBridge, _chainID);
    }
}
