// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./RelayRecipient.sol";
import "./IStableSwapPool.sol";
import "../interfaces/IERC20WithPermit.sol";
import "../interfaces/ISynthesis.sol";
import "../IUniswapV2Router01.sol";

contract CurveProxyV2 is Initializable, RelayRecipient {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    string public versionRecipient;
    //pool_address => enumerable_token_set
    mapping(address => EnumerableSetUpgradeable.AddressSet) private pool;
    //pool_address => lp_token_address
    mapping(address => address) private lpToken;
    address public portal;
    address public synthesis;
    address public bridge;
    address public uniswapRouter;

    function initialize(
        address _forwarder,
        address _portal,
        address _synthesis,
        address _bridge,
        address _uniswapRouter
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        _setTrustedForwarder(_forwarder);
        portal = _portal;
        synthesis = _synthesis;
        bridge = _bridge;
        versionRecipient = "2.2.3";
        uniswapRouter = _uniswapRouter;
    }

    struct EmergencyUnsynthParams {
        address initialPortal;
        address initialBridge;
        uint256 initialChainID;
        uint8 v;
        bytes32 r;
        bytes32 s;
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

    struct SwapExactTokensParams {
        uint amountOutMin;
        address[] path;
        address to;
        uint deadline;
    }

    event InconsistencyCallback(address pool, address token, address to, uint256 amount);

    modifier onlyBridge() {
        require(bridge == _msgSender());
        _;
    }

    function setTrustedForwarder(address _forwarder) external onlyOwner {
        return _setTrustedForwarder(_forwarder);
    }

    function registerNewBalance(address token, uint256 expectedAmount) internal view {
        require(
            IERC20Upgradeable(token).balanceOf(address(this)) >= expectedAmount,
            "CurveProxy: insufficient balance"
        );
    }

    /**
     * @dev Set the corresponding pool data to use proxy with
     * @param _pool pool address
     * @param _lpToken lp token address for the corresponding pool
     * @param _coins listed token addresses
     */
    function setPool(
        address _pool,
        address _lpToken,
        address[] calldata _coins
    ) public onlyOwner {
        for (uint256 i = 0; i < _coins.length; i++) {
            pool[_pool].add(_coins[i]);
        }
        lpToken[_pool] = _lpToken;
    }


    // function transitSynthBatchAddLiquidity3PoolMintEUSDSwap(
    //     MetaMintEUSD calldata _params,
    //     EmergencyUnsynthParams calldata _emergencyParams,
    //     address[3] calldata _synthToken,
    //     uint256[3] calldata _synthAmount,
    //     bytes32[3] calldata _txId,
    //     SwapExactTokensParams calldata _swapParams
    // ) external {
    //     {
    //         address[3] memory representation;

    //         //synthesize stage
    //         for (uint256 i = 0; i < _txId.length; i++) {
    //             representation[i] = ISynthesis(synthesis).getRepresentation(bytes32(uint256(uint160(_synthToken[i]))));
    //             if (_synthAmount[i] > 0) {
    //                 ISynthesis(synthesis).mintSyntheticToken(_txId[i], _synthToken[i], _synthAmount[i], address(this));
    //                 IERC20Upgradeable(representation[i]).approve(_params.addAtCrosschainPool, _synthAmount[i]);
    //             }
    //         }

    //         //add liquidity crosschain stage
    //         uint256 minMintAmountC = IStableSwapPool(_params.addAtCrosschainPool).calc_token_amount(_synthAmount, true);

    //         //inconsistency check
    //         if (_params.expectedMinMintAmountC > minMintAmountC) {
    //             for (uint256 i = 0; i < representation.length; i++) {
    //                 if (_synthAmount[i] > 0) {
    //                     ISynthesis(synthesis).emergencyUnsyntesizeRequest(
    //                         _txId[i],
    //                         _emergencyParams.initialPortal,
    //                         _emergencyParams.initialBridge,
    //                         _emergencyParams.initialChainID,
    //                         _emergencyParams.v,
    //                         _emergencyParams.r,
    //                         _emergencyParams.s
    //                     );
    //                     emit InconsistencyCallback(
    //                         _params.addAtCrosschainPool,
    //                         representation[i],
    //                         _params.to,
    //                         _synthAmount[i]
    //                     );
    //                 }
    //             }
    //             return;
    //         }

    //         //add liquidity to the crosschain pool
    //         IStableSwapPool(_params.addAtCrosschainPool).add_liquidity(_synthAmount, 0);
    //     }
    //     //HUB STAGE (3pool only)
    //     IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).approve(
    //         _params.addAtHubPool,
    //         IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).balanceOf(address(this))
    //     );
    //     uint256[3] memory amountH;
    //     amountH[_params.lpIndex] = IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).balanceOf(address(this));

    //     //add liquidity hub stage
    //     uint256 minMintAmountH = IStableSwapPool(_params.addAtHubPool).calc_token_amount(_synthAmount, true);
    //     //inconsistency check hub stage
    //     if (_params.expectedMinMintAmountH > minMintAmountH) {
    //         //TODO: check index
    //         for (uint256 i = 0; i < _txId.length; i++) {
    //             if (_synthAmount[i] > 0) {
    //                 ISynthesis(synthesis).emergencyUnsyntesizeRequest(
    //                     _txId[i],
    //                     _emergencyParams.initialPortal,
    //                     _emergencyParams.initialBridge,
    //                     _emergencyParams.initialChainID,
    //                     _emergencyParams.v,
    //                     _emergencyParams.r,
    //                     _emergencyParams.s
    //                 );
    //             }
    //         }
    //         emit InconsistencyCallback(
    //             _params.addAtHubPool,
    //             lpToken[_params.addAtHubPool],
    //             _params.to,
    //             amountH[_params.lpIndex]
    //         );
    //         return;
    //     }

    //     //add liquidity
    //     IStableSwapPool(_params.addAtHubPool).add_liquidity(amountH, 0);

    //     //address[] memory path = [lpToken[_params.addAtHubPool],_swapParams.desiredToken];
    //     // path.push(lpToken[_params.addAtHubPool]);
    //     // path.push(_swapParams.desiredToken);

    //     //transfer EUSD to the recipient
    //     uint256 thisBalance = IERC20Upgradeable(lpToken[_params.addAtHubPool]).balanceOf(address(this));
    //     IUniswapV2Router01(uniswapRouter).swapExactTokensForTokens(
    //     thisBalance,   //thisBalance
    //     _swapParams.amountOutMin, 
    //     _swapParams.path, // EUSD -> Desired Token
    //     _params.to, //_params.to
    //     _swapParams.deadline);
    // }

    // /**
    //  * @dev Mint EUSD from external chains
    //  * @param _params meta mint EUSD params
    //  * @param _synthToken tokens to synth from an external chain
    //  * @param _synthAmount amounts to synth from an external chain
    //  * @param _txId transaction IDs
    //  */
    // function transitSynthBatchAddLiquidity3PoolMintEUSD(
    //     MetaMintEUSD calldata _params,
    //     EmergencyUnsynthParams calldata _emergencyParams,
    //     address[3] calldata _synthToken,
    //     uint256[3] calldata _synthAmount,
    //     bytes32[3] calldata _txId
    // ) external onlyBridge {
    //     // {
    //         address[3] memory representation;

    //         //synthesize stage
    //         for (uint256 i = 0; i < _txId.length; i++) {
    //             representation[i] = ISynthesis(synthesis).getRepresentation(bytes32(uint256(uint160(_synthToken[i]))));
    //             if (_synthAmount[i] > 0) {
    //                 ISynthesis(synthesis).mintSyntheticToken(_txId[i], _synthToken[i], _synthAmount[i], address(this));
    //                 IERC20Upgradeable(representation[i]).approve(_params.addAtCrosschainPool, _synthAmount[i]);
    //             }
    //         }

    //     //     //add liquidity crosschain stage
    //     //     uint256 minMintAmountC = IStableSwapPool(_params.addAtCrosschainPool).calc_token_amount(_synthAmount, true);

    //     //     //inconsistency check
    //     //     if (_params.expectedMinMintAmountC > minMintAmountC) {
    //     //         for (uint256 i = 0; i < representation.length; i++) {
    //     //             if (_synthAmount[i] > 0) {
    //     //                 ISynthesis(synthesis).emergencyUnsyntesizeRequest(
    //     //                     _txId[i],
    //     //                     _emergencyParams.initialPortal,
    //     //                     _emergencyParams.initialBridge,
    //     //                     _emergencyParams.initialChainID,
    //     //                     _emergencyParams.v,
    //     //                     _emergencyParams.r,
    //     //                     _emergencyParams.s
    //     //                 );
    //     //                 emit InconsistencyCallback(
    //     //                     _params.addAtCrosschainPool,
    //     //                     representation[i],
    //     //                     _params.to,
    //     //                     _synthAmount[i]
    //     //                 );
    //     //             }
    //     //         }
    //     //         return;
    //     //     }

    //     //     //add liquidity to the crosschain pool
    //     //     IStableSwapPool(_params.addAtCrosschainPool).add_liquidity(_synthAmount, 0);
    //     // }
    //     // //HUB STAGE (3pool only)
    //     // IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).approve(
    //     //     _params.addAtHubPool,
    //     //     IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).balanceOf(address(this))
    //     // );
    //     // uint256[3] memory amountH;
    //     // amountH[_params.lpIndex] = IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).balanceOf(address(this));

    //     // //add liquidity hub stage
    //     // uint256 minMintAmountH = IStableSwapPool(_params.addAtHubPool).calc_token_amount(_synthAmount, true);
    //     // //inconsistency check hub stage
    //     // if (_params.expectedMinMintAmountH > minMintAmountH) {
    //     //     //TODO: check index
    //     //     for (uint256 i = 0; i < _txId.length; i++) {
    //     //         if (_synthAmount[i] > 0) {
    //     //             ISynthesis(synthesis).emergencyUnsyntesizeRequest(
    //     //                 _txId[i],
    //     //                 _emergencyParams.initialPortal,
    //     //                 _emergencyParams.initialBridge,
    //     //                 _emergencyParams.initialChainID,
    //     //                 _emergencyParams.v,
    //     //                 _emergencyParams.r,
    //     //                 _emergencyParams.s
    //     //             );
    //     //         }
    //     //     }
    //     //     emit InconsistencyCallback(
    //     //         _params.addAtHubPool,
    //     //         lpToken[_params.addAtHubPool],
    //     //         _params.to,
    //     //         amountH[_params.lpIndex]
    //     //     );
    //     //     return;
    //     // }

    //     // //add liquidity
    //     // IStableSwapPool(_params.addAtHubPool).add_liquidity(amountH, 0);

    //     // //transfer EUSD to the recipient
    //     // uint256 thisBalance = IERC20Upgradeable(lpToken[_params.addAtHubPool]).balanceOf(address(this));
    //     // IERC20Upgradeable(lpToken[_params.addAtHubPool]).safeTransfer(_params.to, thisBalance);
    // }

// function transitSynthBatchAddLiquidity3PoolMintEUSDSwap(
//         MetaMintEUSD calldata _params,
//         EmergencyUnsynthParams calldata _emergencyParams,
//         address[3] calldata _synthToken,
//         uint256[3] calldata _synthAmount,
//         bytes32[3] calldata _txId,
//         SwapExactTokensParams calldata _swapParams
//     ) external {
//         {
//             address[3] memory representation;

//             //synthesize stage
//             for (uint256 i = 0; i < _txId.length; i++) {
//                 representation[i] = ISynthesis(synthesis).getRepresentation(bytes32(uint256(uint160(_synthToken[i]))));
//                 if (_synthAmount[i] > 0) {
//                     ISynthesis(synthesis).mintSyntheticToken(_txId[i], _synthToken[i], _synthAmount[i], address(this));
//                     IERC20Upgradeable(representation[i]).approve(_params.addAtCrosschainPool, _synthAmount[i]);
//                 }
//             }

//             //add liquidity crosschain stage
//             uint256 minMintAmountC = IStableSwapPool(_params.addAtCrosschainPool).calc_token_amount(_synthAmount, true);

//             //inconsistency check
//             if (_params.expectedMinMintAmountC > minMintAmountC) {
//                 for (uint256 i = 0; i < representation.length; i++) {
//                     if (_synthAmount[i] > 0) {
//                         ISynthesis(synthesis).emergencyUnsyntesizeRequest(
//                             _txId[i],
//                             _emergencyParams.initialPortal,
//                             _emergencyParams.initialBridge,
//                             _emergencyParams.initialChainID,
//                             _emergencyParams.v,
//                             _emergencyParams.r,
//                             _emergencyParams.s
//                         );
//                         emit InconsistencyCallback(
//                             _params.addAtCrosschainPool,
//                             representation[i],
//                             _params.to,
//                             _synthAmount[i]
//                         );
//                     }
//                 }
//                 return;
//             }

//             //add liquidity to the crosschain pool
//             IStableSwapPool(_params.addAtCrosschainPool).add_liquidity(_synthAmount, 0);
//         }
//         //HUB STAGE (3pool only)
//         IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).approve(
//             _params.addAtHubPool,
//             IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).balanceOf(address(this))
//         );
//         uint256[3] memory amountH;
//         amountH[_params.lpIndex] = IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).balanceOf(address(this));

//         //add liquidity hub stage
//         uint256 minMintAmountH = IStableSwapPool(_params.addAtHubPool).calc_token_amount(_synthAmount, true);
//         //inconsistency check hub stage
//         if (_params.expectedMinMintAmountH > minMintAmountH) {
//             //TODO: check index
//             for (uint256 i = 0; i < _txId.length; i++) {
//                 if (_synthAmount[i] > 0) {
//                     ISynthesis(synthesis).emergencyUnsyntesizeRequest(
//                         _txId[i],
//                         _emergencyParams.initialPortal,
//                         _emergencyParams.initialBridge,
//                         _emergencyParams.initialChainID,
//                         _emergencyParams.v,
//                         _emergencyParams.r,
//                         _emergencyParams.s
//                     );
//                 }
//             }
//             emit InconsistencyCallback(
//                 _params.addAtHubPool,
//                 lpToken[_params.addAtHubPool],
//                 _params.to,
//                 amountH[_params.lpIndex]
//             );
//             return;
//         }

//         //add liquidity
//         IStableSwapPool(_params.addAtHubPool).add_liquidity(amountH, 0);

//         //address[] memory path = [lpToken[_params.addAtHubPool],_swapParams.desiredToken];
//         // path.push(lpToken[_params.addAtHubPool]);
//         // path.push(_swapParams.desiredToken);

//         //transfer EUSD to the recipient
//         uint256 thishalfBalance = IERC20Upgradeable(lpToken[_params.addAtHubPool]).balanceOf(address(this)) / 2;
//         IUniswapV2Router01(uniswapRouter).swapExactTokensForTokens(
//         thishalfBalance,   //thisBalance
//         _swapParams.amountOutMin, 
//         _swapParams.path, // EUSD -> Desired Token
//         address(this), //_params.to
//         _swapParams.deadline);
//         uint256 tokenBalance = IERC20Upgradeable(path[1]).balanceOf(address(this));

//         IUniswapV2Router01(uniswapRouter).addLiquidity(
//             path[0],
//             path[1],
//             thishalfBalance,
//             tokenBalance,
//             _swapParams.amountOutMin,
//             _swapParams.amountOutMin,
//             _params.to,
//             _swapParams.deadline
//         );
//     }
}
