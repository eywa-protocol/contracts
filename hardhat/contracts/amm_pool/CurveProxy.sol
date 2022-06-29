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

contract CurveProxy is Initializable, RelayRecipient {
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

    struct PermitData {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 deadline;
        bool approveMax;
    }

    struct SynthParams {
        address receiveSide;
        address oppositeBridge;
        uint256 chainId;
    }

    struct AddLiquidity {
        address add;
        address to;
        uint256 expectedMinMintAmount;
        //emergency unsynth params
        address initialBridge;
        uint256 initialChainID;
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

    struct SwapExactTokensForTokens {
        uint amountOutMin;
        address desiredToken;
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

    /**
     * @dev Transit synth batch and add liquidity to the 3pool
     * @param _params add liquidity params
     * @param _synthToken tokens to synth from an external chain
     * @param _synthAmount amounts to synth from an external chain
     * @param _txId synth transaction IDs
     */
    function transitSynthBatchAddLiquidity3Pool(
        AddLiquidity calldata _params,
        EmergencyUnsynthParams calldata _emergencyParams,
        address[3] calldata _synthToken,
        uint256[3] calldata _synthAmount,
        bytes32[3] calldata _txId
    ) external onlyBridge {
        address[3] memory representation;

        //synthesize stage
        for (uint256 i = 0; i < _txId.length; i++) {
            representation[i] = ISynthesis(synthesis).getRepresentation(bytes32(uint256(uint160(_synthToken[i]))));
            if (_synthAmount[i] > 0) {
                ISynthesis(synthesis).mintSyntheticToken(_txId[i], _synthToken[i], _synthAmount[i], address(this));
                IERC20Upgradeable(representation[i]).approve(_params.add, _synthAmount[i]);
            }
        }

        //add liquidity stage
        uint256 minMintAmount = IStableSwapPool(_params.add).calc_token_amount(_synthAmount, true);

        //inconsistency check
        if (_params.expectedMinMintAmount > minMintAmount) {
            for (uint256 i = 0; i < representation.length; i++) {
                if (_synthAmount[i] > 0) {
                    ISynthesis(synthesis).emergencyUnsyntesizeRequest(
                        _txId[i],
                        _emergencyParams.initialPortal,
                        _emergencyParams.initialBridge,
                        _emergencyParams.initialChainID,
                        _emergencyParams.v,
                        _emergencyParams.r,
                        _emergencyParams.s
                    );
                    emit InconsistencyCallback(_params.add, representation[i], _params.to, _synthAmount[i]);
                }
            }
            return;
        }

        //add liquidity
        IStableSwapPool(_params.add).add_liquidity(_synthAmount, 0);

        //transfer asset to the recipient
        IERC20Upgradeable(lpToken[_params.add]).safeTransfer(
            _params.to,
            IERC20Upgradeable(lpToken[_params.add]).balanceOf(address(this))
        );
    }

    /**
     * @dev Mint EUSD local case (hub chain only)
     * @param _params MetaMintEUSD params
     * @param _permit permit operation params
     * @param _token token addresses
     * @param _amount amounts to transfer
     */
    function addLiquidity3PoolMintEUSD(
        MetaMintEUSD calldata _params,
        PermitData[] calldata _permit,
        address[3] calldata _token,
        uint256[3] calldata _amount
    ) external {
        //initial transfer stage
        for (uint256 i = 0; i < _amount.length; i++) {
            if (_amount[i] > 0) {
                if (_permit[i].v != 0) {
                    uint256 approveValue = _permit[i].approveMax ? uint256(2**256 - 1) : _amount[i];
                    IERC20WithPermit(_token[i]).permit(
                        _msgSender(),
                        address(this),
                        approveValue,
                        _permit[i].deadline,
                        _permit[i].v,
                        _permit[i].r,
                        _permit[i].s
                    );
                }
                // IERC20Upgradeable(_token[i]).safeTransferFrom(_msgSender(), address(this), _amount[i]);
                registerNewBalance(_token[i], _amount[i]);
                IERC20Upgradeable(_token[i]).approve(_params.addAtCrosschainPool, _amount[i]);
            }
        }

        //add liquidity stage
        uint256 minMintAmountC = IStableSwapPool(_params.addAtCrosschainPool).calc_token_amount(_amount, true);

        //inconsistency check
        if (_params.expectedMinMintAmountC > minMintAmountC) {
            for (uint256 i = 0; i < _token.length; i++) {
                if (_amount[i] > 0) {
                    IERC20Upgradeable(_token[i]).safeTransfer(_params.to, _amount[i]);
                    emit InconsistencyCallback(_params.addAtCrosschainPool, _token[i], _params.to, _amount[i]);
                }
            }
            return;
        }

        //add liquidity
        IStableSwapPool(_params.addAtCrosschainPool).add_liquidity(_amount, 0);

        //HUB STAGE (3pool only)
        IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).approve(
            _params.addAtHubPool,
            IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).balanceOf(address(this))
        );
        uint256[3] memory amountH;
        amountH[_params.lpIndex] = IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).balanceOf(address(this));

        //add liquidity hub stage
        uint256 minMintAmountH = IStableSwapPool(_params.addAtHubPool).calc_token_amount(_amount, true);
        //inconsistency check hub stage
        if (_params.expectedMinMintAmountH > minMintAmountH) {
            //TODO
            IERC20Upgradeable(lpToken[_params.addAtHubPool]).safeTransfer(_params.to, amountH[_params.lpIndex]);
            emit InconsistencyCallback(
                _params.addAtHubPool,
                lpToken[_params.addAtHubPool],
                _params.to,
                amountH[_params.lpIndex]
            );
            return;
        }

        //add liquidity
        IStableSwapPool(_params.addAtHubPool).add_liquidity(amountH, 0);

        //transfer EUSD to the recipient
        uint256 thisBalance = IERC20Upgradeable(lpToken[_params.addAtHubPool]).balanceOf(address(this));
        IERC20Upgradeable(lpToken[_params.addAtHubPool]).safeTransfer(_params.to, thisBalance);
    }

    function transitSynthBatchAddLiquidity3PoolMintEUSDSwap(
        MetaMintEUSD calldata _params,
        EmergencyUnsynthParams calldata _emergencyParams,
        address[3] calldata _synthToken,
        uint256[3] calldata _synthAmount,
        bytes32[3] calldata _txId,
        SwapExactTokensForTokens calldata _swapParams
    ) external {
        {
            address[3] memory representation;

            //synthesize stage
            for (uint256 i = 0; i < _txId.length; i++) {
                representation[i] = ISynthesis(synthesis).getRepresentation(bytes32(uint256(uint160(_synthToken[i]))));
                if (_synthAmount[i] > 0) {
                    ISynthesis(synthesis).mintSyntheticToken(_txId[i], _synthToken[i], _synthAmount[i], address(this));
                    IERC20Upgradeable(representation[i]).approve(_params.addAtCrosschainPool, _synthAmount[i]);
                }
            }

            //add liquidity crosschain stage
            uint256 minMintAmountC = IStableSwapPool(_params.addAtCrosschainPool).calc_token_amount(_synthAmount, true);

            //inconsistency check
            if (_params.expectedMinMintAmountC > minMintAmountC) {
                for (uint256 i = 0; i < representation.length; i++) {
                    if (_synthAmount[i] > 0) {
                        ISynthesis(synthesis).emergencyUnsyntesizeRequest(
                            _txId[i],
                            _emergencyParams.initialPortal,
                            _emergencyParams.initialBridge,
                            _emergencyParams.initialChainID,
                            _emergencyParams.v,
                            _emergencyParams.r,
                            _emergencyParams.s
                        );
                        emit InconsistencyCallback(
                            _params.addAtCrosschainPool,
                            representation[i],
                            _params.to,
                            _synthAmount[i]
                        );
                    }
                }
                return;
            }

            //add liquidity to the crosschain pool
            IStableSwapPool(_params.addAtCrosschainPool).add_liquidity(_synthAmount, 0);
        }
        //HUB STAGE (3pool only)
        IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).approve(
            _params.addAtHubPool,
            IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).balanceOf(address(this))
        );
        uint256[3] memory amountH;
        amountH[_params.lpIndex] = IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).balanceOf(address(this));

        //add liquidity hub stage
        uint256 minMintAmountH = IStableSwapPool(_params.addAtHubPool).calc_token_amount(_synthAmount, true);
        //inconsistency check hub stage
        if (_params.expectedMinMintAmountH > minMintAmountH) {
            //TODO: check index
            for (uint256 i = 0; i < _txId.length; i++) {
                if (_synthAmount[i] > 0) {
                    ISynthesis(synthesis).emergencyUnsyntesizeRequest(
                        _txId[i],
                        _emergencyParams.initialPortal,
                        _emergencyParams.initialBridge,
                        _emergencyParams.initialChainID,
                        _emergencyParams.v,
                        _emergencyParams.r,
                        _emergencyParams.s
                    );
                }
            }
            emit InconsistencyCallback(
                _params.addAtHubPool,
                lpToken[_params.addAtHubPool],
                _params.to,
                amountH[_params.lpIndex]
            );
            return;
        }

        //add liquidity
        IStableSwapPool(_params.addAtHubPool).add_liquidity(amountH, 0);
        //address[] memory path = [lpToken[_params.addAtHubPool],_swapParams.desiredToken];
        // path.push(lpToken[_params.addAtHubPool]);
        // path.push(_swapParams.desiredToken);

        //transfer EUSD to the recipient
        uint256 thisBalance = IERC20Upgradeable(lpToken[_params.addAtHubPool]).balanceOf(address(this));
        IUniswapV2Router01(uniswapRouter).swapExactTokensForTokens(
        thisBalance,   //thisBalance
        _swapParams.amountOutMin, 
        _swapParams.path, // EUSD -> Desired Token
        _params.to, //_params.to
        _swapParams.deadline);
    }

    /**
     * @dev Mint EUSD from external chains
     * @param _params meta mint EUSD params
     * @param _synthToken tokens to synth from an external chain
     * @param _synthAmount amounts to synth from an external chain
     * @param _txId transaction IDs
     */
    function transitSynthBatchAddLiquidity3PoolMintEUSD(
        MetaMintEUSD calldata _params,
        EmergencyUnsynthParams calldata _emergencyParams,
        address[3] calldata _synthToken,
        uint256[3] calldata _synthAmount,
        bytes32[3] calldata _txId
    ) external  {
        {
            address[3] memory representation;

            //synthesize stage
            for (uint256 i = 0; i < _txId.length; i++) {
                representation[i] = ISynthesis(synthesis).getRepresentation(bytes32(uint256(uint160(_synthToken[i]))));
                if (_synthAmount[i] > 0) {
                    ISynthesis(synthesis).mintSyntheticToken(_txId[i], _synthToken[i], _synthAmount[i], address(this));
                    IERC20Upgradeable(representation[i]).approve(_params.addAtCrosschainPool, _synthAmount[i]);
                }
            }

            //add liquidity crosschain stage
            uint256 minMintAmountC = IStableSwapPool(_params.addAtCrosschainPool).calc_token_amount(_synthAmount, true);

            //inconsistency check
            if (_params.expectedMinMintAmountC > minMintAmountC) {
                for (uint256 i = 0; i < representation.length; i++) {
                    if (_synthAmount[i] > 0) {
                        ISynthesis(synthesis).emergencyUnsyntesizeRequest(
                            _txId[i],
                            _emergencyParams.initialPortal,
                            _emergencyParams.initialBridge,
                            _emergencyParams.initialChainID,
                            _emergencyParams.v,
                            _emergencyParams.r,
                            _emergencyParams.s
                        );
                        emit InconsistencyCallback(
                            _params.addAtCrosschainPool,
                            representation[i],
                            _params.to,
                            _synthAmount[i]
                        );
                    }
                }
                return;
            }

            //add liquidity to the crosschain pool
            IStableSwapPool(_params.addAtCrosschainPool).add_liquidity(_synthAmount, 0);
        }
        //HUB STAGE (3pool only)
        IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).approve(
            _params.addAtHubPool,
            IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).balanceOf(address(this))
        );
        uint256[3] memory amountH;
        amountH[_params.lpIndex] = IERC20Upgradeable(lpToken[_params.addAtCrosschainPool]).balanceOf(address(this));

        //add liquidity hub stage
        uint256 minMintAmountH = IStableSwapPool(_params.addAtHubPool).calc_token_amount(_synthAmount, true);
        //inconsistency check hub stage
        if (_params.expectedMinMintAmountH > minMintAmountH) {
            //TODO: check index
            for (uint256 i = 0; i < _txId.length; i++) {
                if (_synthAmount[i] > 0) {
                    ISynthesis(synthesis).emergencyUnsyntesizeRequest(
                        _txId[i],
                        _emergencyParams.initialPortal,
                        _emergencyParams.initialBridge,
                        _emergencyParams.initialChainID,
                        _emergencyParams.v,
                        _emergencyParams.r,
                        _emergencyParams.s
                    );
                }
            }
            emit InconsistencyCallback(
                _params.addAtHubPool,
                lpToken[_params.addAtHubPool],
                _params.to,
                amountH[_params.lpIndex]
            );
            return;
        }

        //add liquidity
        IStableSwapPool(_params.addAtHubPool).add_liquidity(amountH, 0);

        //transfer EUSD to the recipient
        uint256 thisBalance = IERC20Upgradeable(lpToken[_params.addAtHubPool]).balanceOf(address(this));
        IERC20Upgradeable(lpToken[_params.addAtHubPool]).safeTransfer(_params.to, thisBalance);
    }

    /**
     * @dev Performs a meta exchange on request from external chains
     * @param _params meta exchange params
     * @param _synthToken tokens to synth from an external chain
     * @param _synthAmount amounts to synth from an external chain
     * @param _txId synth transaction IDs
     */
    function transitSynthBatchMetaExchange(
        MetaExchangeParams calldata _params,
        EmergencyUnsynthParams calldata _emergencyParams,
        address[3] calldata _synthToken,
        uint256[3] calldata _synthAmount,
        bytes32[3] calldata _txId
    ) external onlyBridge {
        {
            address[3] memory representation;

            //synthesize stage
            for (uint256 i = 0; i < _txId.length; i++) {
                representation[i] = ISynthesis(synthesis).getRepresentation(bytes32(uint256(uint160(_synthToken[i]))));
                if (_synthAmount[i] > 0) {
                    ISynthesis(synthesis).mintSyntheticToken(_txId[i], _synthToken[i], _synthAmount[i], address(this));
                    IERC20Upgradeable(representation[i]).approve(_params.add, _synthAmount[i]);
                }
            }

            //add liquidity stage
            uint256 minMintAmount = IStableSwapPool(_params.add).calc_token_amount(_synthAmount, true);
            //inconsistency check
            if (_params.expectedMinMintAmount > minMintAmount) {
                for (uint256 i = 0; i < representation.length; i++) {
                    if (_synthAmount[i] > 0) {
                        ISynthesis(synthesis).emergencyUnsyntesizeRequest(
                            _txId[i],
                            _emergencyParams.initialPortal,
                            _emergencyParams.initialBridge,
                            _emergencyParams.initialChainID,
                            _emergencyParams.v,
                            _emergencyParams.r,
                            _emergencyParams.s
                        );
                        emit InconsistencyCallback(_params.add, representation[i], _params.to, _synthAmount[i]);
                    }
                }
                return;
            }

            //add liquidity
            IStableSwapPool(_params.add).add_liquidity(_synthAmount, 0);
        }
        //meta-exchange stage
        {
            address lpLocalPool = lpToken[_params.add];

            // IERC20Upgradeable(lpLocalPool).approve(_params.exchange, 0); //CurveV2 token support
            IERC20Upgradeable(lpLocalPool).approve(
                _params.exchange,
                IERC20Upgradeable(lpLocalPool).balanceOf(address(this))
            );

            uint256 dx = IERC20Upgradeable(lpLocalPool).balanceOf(address(this)); //amount to swap
            try IStableSwapPool(_params.exchange).get_dy(_params.i, _params.j, dx) returns (uint256 min_dy) {
                //inconsistency check
                if (_params.expectedMinDy > min_dy) {
                    for (uint256 i = 0; i < _txId.length; i++) {
                        if (_synthAmount[i] > 0) {
                            ISynthesis(synthesis).emergencyUnsyntesizeRequest(
                                _txId[i],
                                _emergencyParams.initialPortal,
                                _emergencyParams.initialBridge,
                                _emergencyParams.initialChainID,
                                _emergencyParams.v,
                                _emergencyParams.r,
                                _emergencyParams.s
                            );
                        }
                    }
                    emit InconsistencyCallback(
                        _params.exchange,
                        pool[_params.exchange].at(uint256(int256(_params.i))),
                        _params.to,
                        IERC20Upgradeable(pool[_params.exchange].at(uint256(int256(_params.i)))).balanceOf(
                            address(this)
                        )
                    );
                    return;
                }
                //perform exhange
                IStableSwapPool(_params.exchange).exchange(_params.i, _params.j, dx, min_dy);
            } catch {
                for (uint256 i = 0; i < _txId.length; i++) {
                    if (_synthAmount[i] > 0) {
                        ISynthesis(synthesis).emergencyUnsyntesizeRequest(
                            _txId[i],
                            _emergencyParams.initialPortal,
                            _emergencyParams.initialBridge,
                            _emergencyParams.initialChainID,
                            _emergencyParams.v,
                            _emergencyParams.r,
                            _emergencyParams.s
                        );
                    }
                }
                return;
            }
        }

        //remove liquidity one coin stage
        address thisLpToken = lpToken[_params.remove];
        // IERC20Upgradeable(lpToken).approve(_params.remove, 0); //CurveV2 token support
        IERC20Upgradeable(thisLpToken).approve(_params.remove, IERC20Upgradeable(thisLpToken).balanceOf(address(this)));

        uint256 tokenAmount = IERC20Upgradeable(thisLpToken).balanceOf(address(this));
        try IStableSwapPool(_params.remove).calc_withdraw_one_coin(tokenAmount, _params.x) returns (uint256 minAmount) {
            //inconsistency check
            if (_params.expectedMinAmount > minAmount) {
                for (uint256 i = 0; i < _txId.length; i++) {
                    if (_synthAmount[i] > 0) {
                        ISynthesis(synthesis).emergencyUnsyntesizeRequest(
                            _txId[i],
                            _emergencyParams.initialPortal,
                            _emergencyParams.initialBridge,
                            _emergencyParams.initialChainID,
                            _emergencyParams.v,
                            _emergencyParams.r,
                            _emergencyParams.s
                        );
                    }
                }
                emit InconsistencyCallback(_params.remove, thisLpToken, _params.to, tokenAmount);
                return;
            }
        } catch {
            for (uint256 i = 0; i < _txId.length; i++) {
                if (_synthAmount[i] > 0) {
                    ISynthesis(synthesis).emergencyUnsyntesizeRequest(
                        _txId[i],
                        _emergencyParams.initialPortal,
                        _emergencyParams.initialBridge,
                        _emergencyParams.initialChainID,
                        _emergencyParams.v,
                        _emergencyParams.r,
                        _emergencyParams.s
                    );
                }
            }
        }

        //remove liquidity
        try IStableSwapPool(_params.remove).remove_liquidity_one_coin(tokenAmount, _params.x, 0) {
            //transfer asset to the recipient (unsynth if mentioned)
            uint256 thisBalance = IERC20Upgradeable(pool[_params.remove].at(uint256(int256(_params.x)))).balanceOf(
                address(this)
            );
            if (_params.chainId != 0) {
                IERC20Upgradeable(pool[_params.remove].at(uint256(int256(_params.x)))).approve(synthesis, thisBalance);
                ISynthesis.SynthParams memory synthParams = ISynthesis.SynthParams(
                    _params.receiveSide,
                    _params.oppositeBridge,
                    _params.chainId
                );
                ISynthesis(synthesis).burnSyntheticToken(
                    pool[_params.remove].at(uint256(int256(_params.x))),
                    thisBalance,
                    address(this),
                    _params.to,
                    synthParams
                );
            } else {
                IERC20Upgradeable(pool[_params.remove].at(uint256(int256(_params.x)))).safeTransfer(
                    _params.to,
                    thisBalance
                );
            }
        } catch {
            for (uint256 i = 0; i < _txId.length; i++) {
                if (_synthAmount[i] > 0) {
                    ISynthesis(synthesis).emergencyUnsyntesizeRequest(
                        _txId[i],
                        _emergencyParams.initialPortal,
                        _emergencyParams.initialBridge,
                        _emergencyParams.initialChainID,
                        _emergencyParams.v,
                        _emergencyParams.r,
                        _emergencyParams.s
                    );
                }
            }
        }
    }

    /**
     * @dev Redeem EUSD with unsynth operation (hub chain execution only)
     * @param _params meta redeem EUSD params
     * @param _permit permit params
     * @param _receiveSide calldata recipient address for unsynth operation
     * @param _oppositeBridge opposite bridge contract address
     * @param _chainId opposite chain ID
     */
    function redeemEUSD(
        MetaRedeemEUSD calldata _params,
        PermitData calldata _permit,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainId
    ) external {
        {
            address hubLpToken = lpToken[_params.removeAtHubPool];

            //process permit operation if mentioned
            if (_permit.v != 0) {
                uint256 approveValue = _permit.approveMax ? uint256(2**256 - 1) : _params.tokenAmountH;
                IERC20WithPermit(hubLpToken).permit(
                    _msgSender(),
                    address(this),
                    approveValue,
                    _permit.deadline,
                    _permit.v,
                    _permit.r,
                    _permit.s
                );
            }

            //hub pool remove_liquidity_one_coin stage
            // IERC20Upgradeable(hubLpToken).safeTransferFrom(_msgSender(), address(this), _params.tokenAmountH);
            registerNewBalance(hubLpToken, _params.tokenAmountH);
            // IERC20Upgradeable(hubLpToken).approve(_params.removeAtHubPool, 0); //CurveV2 token support
            IERC20Upgradeable(hubLpToken).approve(_params.removeAtHubPool, _params.tokenAmountH);

            //inconsistency check
            uint256 hubLpTokenBalance = IERC20Upgradeable(hubLpToken).balanceOf(address(this));
            uint256 minAmountsH = IStableSwapPool(_params.removeAtHubPool).calc_withdraw_one_coin(
                _params.tokenAmountH,
                _params.y
            );

            if (_params.expectedMinAmountH > minAmountsH) {
                IERC20Upgradeable(hubLpToken).safeTransfer(_params.to, hubLpTokenBalance);
                emit InconsistencyCallback(_params.removeAtHubPool, hubLpToken, _params.to, hubLpTokenBalance);

                return;
            }
            IStableSwapPool(_params.removeAtHubPool).remove_liquidity_one_coin(_params.tokenAmountH, _params.y, 0);
        }
        {
            //crosschain pool remove_liquidity_one_coin stage
            uint256 hubCoinBalance = IERC20Upgradeable(pool[_params.removeAtHubPool].at(uint256(int256(_params.y))))
                .balanceOf(address(this));
            uint256 min_amounts_c = IStableSwapPool(_params.removeAtCrosschainPool).calc_withdraw_one_coin(
                hubCoinBalance,
                _params.x
            );

            //inconsistency check
            if (_params.expectedMinAmountC > min_amounts_c) {
                IERC20Upgradeable(pool[_params.removeAtCrosschainPool].at(uint256(int256(_params.x)))).safeTransfer(
                    _params.to,
                    hubCoinBalance
                );
                emit InconsistencyCallback(
                    _params.removeAtCrosschainPool,
                    pool[_params.removeAtCrosschainPool].at(uint256(int256(_params.x))),
                    _params.to,
                    hubCoinBalance
                );
                return;
            }

            // IERC20Upgradeable(pool[_params.removeAtCrosschainPool].at(uint256(int256(_params.x)))).approve(_params.removeAtCrosschainPool, 0); //CurveV2 token support
            IERC20Upgradeable(pool[_params.removeAtCrosschainPool].at(uint256(int256(_params.x)))).approve(
                _params.removeAtCrosschainPool,
                hubCoinBalance
            );
            IStableSwapPool(_params.removeAtCrosschainPool).remove_liquidity_one_coin(hubCoinBalance, _params.x, 0);

            //transfer outcome to the recipient (unsynth if mentioned)
            uint256 thisBalance = IERC20Upgradeable(pool[_params.removeAtCrosschainPool].at(uint256(int256(_params.x))))
                .balanceOf(address(this));
            if (_chainId != 0) {
                IERC20Upgradeable(pool[_params.removeAtCrosschainPool].at(uint256(int256(_params.x)))).approve(
                    synthesis,
                    thisBalance
                );
                ISynthesis.SynthParams memory synthParams = ISynthesis.SynthParams(
                    _receiveSide,
                    _oppositeBridge,
                    _chainId
                );
                ISynthesis(synthesis).burnSyntheticToken(
                    pool[_params.removeAtCrosschainPool].at(uint256(int256(_params.x))),
                    thisBalance,
                    address(this),
                    _params.to,
                    synthParams
                );
            } else {
                IERC20Upgradeable(pool[_params.removeAtCrosschainPool].at(uint256(int256(_params.x)))).safeTransfer(
                    _params.to,
                    thisBalance
                );
            }
        }
    }
}
