// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface ICurveProxy {
    struct PermitData {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 deadline;
        bool approveMax;
    }

    struct MetaMintEUSD {
        //crosschain pool params
        address addAtCrosschainPool;
        uint256 expectedMinMintAmountC;
        //incoming coin index for adding liq to hub pool
        uint256 lpIndex;
        //hub pool params
        address addAtHubPool;
        uint256 expectedMinMintAmountH;
        //recipient address
        address to;
    }

    struct MetaRedeemEUSD {
        //crosschain pool params
        address removeAtCrosschainPool;
        //outcome index
        int128 x;
        uint256 expectedMinAmountC;
        //hub pool params
        address removeAtHubPool;
        uint256 tokenAmountH;
        //lp index
        int128 y;
        uint256 expectedMinAmountH;
        //recipient address
        address to;
    }

    struct SwapExactTokensParams {
        uint amountOutMin;
        address path;
        address to;
        uint deadline;
    }

    struct MetaExchangeParams {
        //pool address
        address add;
        address exchange;
        address remove;
        //add liquidity params
        uint256 expectedMinMintAmount;
        //exchange params
        int128 i; //index value for the coin to send
        int128 j; //index value of the coin to receive
        uint256 expectedMinDy;
        //withdraw one coin params
        int128 x; //index value of the coin to withdraw
        uint256 expectedMinAmount;
        //transfer to
        address to;
        //unsynth params
        address chain2address;
        address receiveSide;
        address oppositeBridge;
        uint256 chainId;
    }

    struct EmergencyUnsynthParams {
        address initialPortal;
        address initialBridge;
        uint256 initialChainID;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    struct MetaTokenParams {
        address[3] token;
        uint256[3] amount;
        address from;
    }

    function addLiquidity3PoolMintEUSD(
        MetaMintEUSD calldata params,
        PermitData[] calldata permit,
        address[3] calldata token,
        uint256[3] calldata amount
    ) external;

    function metaExchange(
        MetaExchangeParams calldata params,
        PermitData[] calldata permit,
        address[3] calldata token,
        uint256[3] calldata amount
    ) external;

    function redeemEUSD(
        MetaRedeemEUSD calldata params,
        PermitData calldata permit,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId
    ) external;

}
