// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./RelayRecipient.sol";
import "./IStableSwapPool.sol";
import "../interfaces/IERC20WithPermit.sol";
import "../interfaces/ISynthesis.sol";

contract CurveProxy is Initializable, RelayRecipient {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    string public _versionRecipient;
    //pool_address => enumerable_token_set
    mapping(address => EnumerableSetUpgradeable.AddressSet) private _pool;
    //pool_address => lp_token_address
    mapping(address => address) private _lpToken;
    address public _portal;
    address public _synthesis;
    address public _bridge;

    function initialize(
        address forwarder,
        address portal,
        address synthesis,
        address bridge
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        _setTrustedForwarder(forwarder);
        _portal = portal;
        _synthesis = synthesis;
        _bridge = bridge;
        _versionRecipient = "2.2.3";
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

    event InconsistencyCallback(address pool, address token, address to, uint256 amount);

    modifier onlyBridge() {
        require(_bridge == _msgSender());
        _;
    }

    function setTrustedForwarder(address forwarder) external onlyOwner {
        return _setTrustedForwarder(forwarder);
    }

    function registerNewBalance(address token, uint256 expectedAmount) internal view {
        require(
            IERC20Upgradeable(token).balanceOf(address(this)) >= expectedAmount,
            "CurveProxy: insufficient balance"
        );
    }

    /**
     * @dev Set the corresponding pool data to use proxy with
     * @param pool pool address
     * @param lpToken lp token address for the corresponding pool
     * @param coins listed token addresses
     */
    function setPool(
        address pool,
        address lpToken,
        address[] calldata coins
    ) public onlyOwner {
        for (uint256 i = 0; i < coins.length; i++) {
            _pool[pool].add(coins[i]);
        }
        _lpToken[pool] = lpToken;
    }

    /**
     * @dev Transit synth batch and add liquidity to the 3pool
     * @param params add liquidity params
     * @param synthToken tokens to synth from an external chain
     * @param synthAmount amounts to synth from an external chain
     * @param txId synth transaction IDs
     */
    function transitSynthBatchAddLiquidity3Pool(
        AddLiquidity calldata params,
        EmergencyUnsynthParams calldata emergencyParams,
        address[3] calldata synthToken,
        uint256[3] calldata synthAmount,
        bytes32[3] calldata txId
    ) external onlyBridge {
        address[3] memory _representation;

        //synthesize stage
        for (uint256 i = 0; i < txId.length; i++) {
            _representation[i] = ISynthesis(_synthesis).getRepresentation(bytes32(uint256(uint160(synthToken[i]))));
            if (synthAmount[i] > 0) {
                ISynthesis(_synthesis).mintSyntheticToken(txId[i], synthToken[i], synthAmount[i], address(this));
                IERC20Upgradeable(_representation[i]).approve(params.add, synthAmount[i]);
            }
        }

        //add liquidity stage
        uint256 _minMintAmount = IStableSwapPool(params.add).calc_token_amount(synthAmount, true);

        //inconsistency check
        if (params.expectedMinMintAmount > _minMintAmount) {
            for (uint256 i = 0; i < _representation.length; i++) {
                if (synthAmount[i] > 0) {
                    ISynthesis(_synthesis).emergencyUnsyntesizeRequest(
                        txId[i],
                        emergencyParams.initialPortal,
                        emergencyParams.initialBridge,
                        emergencyParams.initialChainID,
                        emergencyParams.v,
                        emergencyParams.r,
                        emergencyParams.s
                    );
                    emit InconsistencyCallback(params.add, _representation[i], params.to, synthAmount[i]);
                }
            }
            return;
        }

        //add liquidity
        IStableSwapPool(params.add).add_liquidity(synthAmount, 0);

        //transfer asset to the recipient
        IERC20Upgradeable(_lpToken[params.add]).safeTransfer(
            params.to,
            IERC20Upgradeable(_lpToken[params.add]).balanceOf(address(this))
        );
    }

    /**
     * @dev Mint EUSD local case (hub chain only)
     * @param params MetaMintEUSD params
     * @param permit permit operation params
     * @param token token addresses
     * @param amount amounts to transfer
     */
    function addLiquidity3PoolMintEUSD(
        MetaMintEUSD calldata params,
        PermitData[] calldata permit,
        address[3] calldata token,
        uint256[3] calldata amount
    ) external {
        //initial transfer stage
        for (uint256 i = 0; i < amount.length; i++) {
            if (amount[i] > 0) {
                if (permit[i].v != 0) {
                    uint256 _approveValue = permit[i].approveMax ? uint256(2**256 - 1) : amount[i];
                    IERC20WithPermit(token[i]).permit(
                        _msgSender(),
                        address(this),
                        _approveValue,
                        permit[i].deadline,
                        permit[i].v,
                        permit[i].r,
                        permit[i].s
                    );
                }
                // IERC20Upgradeable(_token[i]).safeTransferFrom(_msgSender(), address(this), _amount[i]);
                registerNewBalance(token[i], amount[i]);
                IERC20Upgradeable(token[i]).approve(params.addAtCrosschainPool, amount[i]);
            }
        }

        //add liquidity stage
        uint256 _minMintAmountC = IStableSwapPool(params.addAtCrosschainPool).calc_token_amount(amount, true);

        //inconsistency check
        if (params.expectedMinMintAmountC > _minMintAmountC) {
            for (uint256 i = 0; i < token.length; i++) {
                if (amount[i] > 0) {
                    IERC20Upgradeable(token[i]).safeTransfer(params.to, amount[i]);
                    emit InconsistencyCallback(params.addAtCrosschainPool, token[i], params.to, amount[i]);
                }
            }
            return;
        }

        //add liquidity
        IStableSwapPool(params.addAtCrosschainPool).add_liquidity(amount, 0);

        //HUB STAGE (3pool only)
        IERC20Upgradeable(_lpToken[params.addAtCrosschainPool]).approve(
            params.addAtHubPool,
            IERC20Upgradeable(_lpToken[params.addAtCrosschainPool]).balanceOf(address(this))
        );
        uint256[3] memory _amountH;
        _amountH[params.lpIndex] = IERC20Upgradeable(_lpToken[params.addAtCrosschainPool]).balanceOf(address(this));

        //add liquidity hub stage
        uint256 _minMintAmountH = IStableSwapPool(params.addAtHubPool).calc_token_amount(amount, true);
        //inconsistency check hub stage
        if (params.expectedMinMintAmountH > _minMintAmountH) {
            //TODO
            IERC20Upgradeable(_lpToken[params.addAtHubPool]).safeTransfer(params.to, _amountH[params.lpIndex]);
            emit InconsistencyCallback(
                params.addAtHubPool,
                _lpToken[params.addAtHubPool],
                params.to,
                _amountH[params.lpIndex]
            );
            return;
        }

        //add liquidity
        IStableSwapPool(params.addAtHubPool).add_liquidity(_amountH, 0);

        //transfer EUSD to the recipient
        uint256 _thisBalance = IERC20Upgradeable(_lpToken[params.addAtHubPool]).balanceOf(address(this));
        IERC20Upgradeable(_lpToken[params.addAtHubPool]).safeTransfer(params.to, _thisBalance);
    }

    /**
     * @dev Mint EUSD from external chains
     * @param params meta mint EUSD params
     * @param synthToken tokens to synth from an external chain
     * @param synthAmount amounts to synth from an external chain
     * @param txId transaction IDs
     */
    function transitSynthBatchAddLiquidity3PoolMintEUSD(
        MetaMintEUSD calldata params,
        EmergencyUnsynthParams calldata emergencyParams,
        address[3] calldata synthToken,
        uint256[3] calldata synthAmount,
        bytes32[3] calldata txId
    ) external onlyBridge {
        {
            address[3] memory _representation;

            //synthesize stage
            for (uint256 i = 0; i < txId.length; i++) {
                _representation[i] = ISynthesis(_synthesis).getRepresentation(bytes32(uint256(uint160(synthToken[i]))));
                if (synthAmount[i] > 0) {
                    ISynthesis(_synthesis).mintSyntheticToken(txId[i], synthToken[i], synthAmount[i], address(this));
                    IERC20Upgradeable(_representation[i]).approve(params.addAtCrosschainPool, synthAmount[i]);
                }
            }

            //add liquidity crosschain stage
            uint256 _minMintAmountC = IStableSwapPool(params.addAtCrosschainPool).calc_token_amount(synthAmount, true);

            //inconsistency check
            if (params.expectedMinMintAmountC > _minMintAmountC) {
                for (uint256 i = 0; i < _representation.length; i++) {
                    if (synthAmount[i] > 0) {
                        ISynthesis(_synthesis).emergencyUnsyntesizeRequest(
                            txId[i],
                            emergencyParams.initialPortal,
                            emergencyParams.initialBridge,
                            emergencyParams.initialChainID,
                            emergencyParams.v,
                            emergencyParams.r,
                            emergencyParams.s
                        );
                        emit InconsistencyCallback(
                            params.addAtCrosschainPool,
                            _representation[i],
                            params.to,
                            synthAmount[i]
                        );
                    }
                }
                return;
            }

            //add liquidity to the crosschain pool
            IStableSwapPool(params.addAtCrosschainPool).add_liquidity(synthAmount, 0);
        }
        //HUB STAGE (3pool only)
        IERC20Upgradeable(_lpToken[params.addAtCrosschainPool]).approve(
            params.addAtHubPool,
            IERC20Upgradeable(_lpToken[params.addAtCrosschainPool]).balanceOf(address(this))
        );
        uint256[3] memory _amountH;
        _amountH[params.lpIndex] = IERC20Upgradeable(_lpToken[params.addAtCrosschainPool]).balanceOf(address(this));

        //add liquidity hub stage
        uint256 _minMintAmountH = IStableSwapPool(params.addAtHubPool).calc_token_amount(synthAmount, true);
        //inconsistency check hub stage
        if (params.expectedMinMintAmountH > _minMintAmountH) {
            //TODO: check index
            for (uint256 i = 0; i < txId.length; i++) {
                if (synthAmount[i] > 0) {
                    ISynthesis(_synthesis).emergencyUnsyntesizeRequest(
                        txId[i],
                        emergencyParams.initialPortal,
                        emergencyParams.initialBridge,
                        emergencyParams.initialChainID,
                        emergencyParams.v,
                        emergencyParams.r,
                        emergencyParams.s
                    );
                }
            }
            emit InconsistencyCallback(
                params.addAtHubPool,
                _lpToken[params.addAtHubPool],
                params.to,
                _amountH[params.lpIndex]
            );
            return;
        }

        //add liquidity
        IStableSwapPool(params.addAtHubPool).add_liquidity(_amountH, 0);

        //transfer EUSD to the recipient
        uint256 _thisBalance = IERC20Upgradeable(_lpToken[params.addAtHubPool]).balanceOf(address(this));
        IERC20Upgradeable(_lpToken[params.addAtHubPool]).safeTransfer(params.to, _thisBalance);
    }

    /**
     * @dev Meta exchange local case (hub chain execution only)
     * @param params meta exchange params
     * @param permit permit operation params
     * @param token token addresses to transfer within initial stage
     * @param amount amounts to transfer within initial stage
     */
    function metaExchange(
        MetaExchangeParams calldata params,
        PermitData[] calldata permit,
        address[3] calldata token,
        uint256[3] calldata amount
    ) external {
        {
            //initial transfer stage
            for (uint256 i = 0; i < amount.length; i++) {
                if (amount[i] > 0) {
                    if (permit[i].v != 0) {
                        uint256 _approveValue = permit[i].approveMax ? uint256(2**256 - 1) : amount[i];
                        IERC20WithPermit(token[i]).permit(
                            _msgSender(),
                            address(this),
                            _approveValue,
                            permit[i].deadline,
                            permit[i].v,
                            permit[i].r,
                            permit[i].s
                        );
                    }
                    // IERC20Upgradeable(_token[i]).safeTransferFrom(_msgSender(), address(this), _amount[i]);
                    registerNewBalance(token[i], amount[i]);
                    IERC20Upgradeable(token[i]).approve(params.add, amount[i]);
                }
            }

            //add liquidity stage
            uint256 _minMintAmount = IStableSwapPool(params.add).calc_token_amount(amount, true);
            //inconsistency check
            if (params.expectedMinMintAmount > _minMintAmount) {
                for (uint256 i = 0; i < token.length; i++) {
                    if (amount[i] > 0) {
                        IERC20Upgradeable(token[i]).safeTransfer(params.to, amount[i]);
                        emit InconsistencyCallback(params.add, token[i], params.to, amount[i]);
                    }
                }
                return;
            }

            //add liquidity
            IStableSwapPool(params.add).add_liquidity(amount, 0);
        }
        //meta-exchange stage
        {
            address _lpLocalPool = _lpToken[params.add];

            // IERC20Upgradeable(lpLocalPool).approve(_params.exchange, 0); //CurveV2 token support
            IERC20Upgradeable(_lpLocalPool).approve(
                params.exchange,
                IERC20Upgradeable(_lpLocalPool).balanceOf(address(this))
            );

            uint256 _dx = IERC20Upgradeable(_lpLocalPool).balanceOf(address(this)); //amount to swap
            uint256 _min_dy = IStableSwapPool(params.exchange).get_dy(params.i, params.j, _dx);

            //inconsistency check
            if (params.expectedMinDy > _min_dy) {
                IERC20Upgradeable(_pool[params.exchange].at(uint256(int256(params.i)))).safeTransfer(
                    params.to,
                    IERC20Upgradeable(_pool[params.exchange].at(uint256(int256(params.i)))).balanceOf(address(this))
                );
                emit InconsistencyCallback(
                    params.exchange,
                    _pool[params.exchange].at(uint256(int256(params.i))),
                    params.to,
                    IERC20Upgradeable(_pool[params.exchange].at(uint256(int256(params.i)))).balanceOf(address(this))
                );
                return;
            }

            //perform an exhange
            IStableSwapPool(params.exchange).exchange(params.i, params.j, _dx, _min_dy);
        }
        {
            //remove liquidity one coin stage
            address _thisLpToken = _lpToken[params.remove];
            // IERC20Upgradeable(lpToken).approve(_params.remove, 0); //CurveV2 token support
            IERC20Upgradeable(_thisLpToken).approve(
                params.remove,
                IERC20Upgradeable(_thisLpToken).balanceOf(address(this))
            );

            uint256 _tokenAmount = IERC20Upgradeable(_thisLpToken).balanceOf(address(this));
            uint256 _minAmount = IStableSwapPool(params.remove).calc_withdraw_one_coin(_tokenAmount, params.x);

            //inconsistency check
            if (params.expectedMinAmount > _minAmount) {
                IERC20Upgradeable(_thisLpToken).safeTransfer(params.to, _tokenAmount);
                emit InconsistencyCallback(params.remove, _thisLpToken, params.to, _tokenAmount);
                return;
            }

            //remove liquidity
            IStableSwapPool(params.remove).remove_liquidity_one_coin(_tokenAmount, params.x, 0);
        }
        //transfer asset to the recipient (unsynth if mentioned)
        uint256 _thisBalance = IERC20Upgradeable(_pool[params.remove].at(uint256(int256(params.x)))).balanceOf(
            address(this)
        );
        if (params.chainId != 0) {
            IERC20Upgradeable(_pool[params.remove].at(uint256(int256(params.x)))).approve(_synthesis, _thisBalance);
            ISynthesis.SynthParams memory synthParams = ISynthesis.SynthParams(
                params.receiveSide,
                params.oppositeBridge,
                params.chainId
            );
            ISynthesis(_synthesis).burnSyntheticToken(
                _pool[params.remove].at(uint256(int256(params.x))),
                _thisBalance,
                address(this),
                params.to,
                synthParams
            );
        } else {
            IERC20Upgradeable(_pool[params.remove].at(uint256(int256(params.x)))).safeTransfer(
                params.to,
                _thisBalance
            );
        }
    }

    /**
     * @dev Performs a meta exchange on request from external chains
     * @param params meta exchange params
     * @param synthToken tokens to synth from an external chain
     * @param synthAmount amounts to synth from an external chain
     * @param txId synth transaction IDs
     */
    function transiSynthBatchMetaExchange(
        MetaExchangeParams calldata params,
        EmergencyUnsynthParams calldata emergencyParams,
        address[3] calldata synthToken,
        uint256[3] calldata synthAmount,
        bytes32[3] calldata txId
    ) external onlyBridge {
        {
            address[3] memory _representation;

            //synthesize stage
            for (uint256 i = 0; i < txId.length; i++) {
                _representation[i] = ISynthesis(_synthesis).getRepresentation(bytes32(uint256(uint160(synthToken[i]))));
                if (synthAmount[i] > 0) {
                    ISynthesis(_synthesis).mintSyntheticToken(txId[i], synthToken[i], synthAmount[i], address(this));
                    IERC20Upgradeable(_representation[i]).approve(params.add, synthAmount[i]);
                }
            }

            //add liquidity stage
            uint256 _minMintAmount = IStableSwapPool(params.add).calc_token_amount(synthAmount, true);
            //inconsistency check
            if (params.expectedMinMintAmount > _minMintAmount) {
                for (uint256 i = 0; i < _representation.length; i++) {
                    if (synthAmount[i] > 0) {
                        ISynthesis(_synthesis).emergencyUnsyntesizeRequest(
                            txId[i],
                            emergencyParams.initialPortal,
                            emergencyParams.initialBridge,
                            emergencyParams.initialChainID,
                            emergencyParams.v,
                            emergencyParams.r,
                            emergencyParams.s
                        );
                        emit InconsistencyCallback(params.add, _representation[i], params.to, synthAmount[i]);
                    }
                }
                return;
            }

            //add liquidity
            IStableSwapPool(params.add).add_liquidity(synthAmount, 0);
        }
        //meta-exchange stage
        {
            address _lpLocalPool = _lpToken[params.add];

            // IERC20Upgradeable(lpLocalPool).approve(_params.exchange, 0); //CurveV2 token support
            IERC20Upgradeable(_lpLocalPool).approve(
                params.exchange,
                IERC20Upgradeable(_lpLocalPool).balanceOf(address(this))
            );

            uint256 _dx = IERC20Upgradeable(_lpLocalPool).balanceOf(address(this)); //amount to swap
            try IStableSwapPool(params.exchange).get_dy(params.i, params.j, _dx) returns (uint256 _min_dy) {
                //inconsistency check
                if (params.expectedMinDy > _min_dy) {
                    for (uint256 i = 0; i < txId.length; i++) {
                        if (synthAmount[i] > 0) {
                            ISynthesis(_synthesis).emergencyUnsyntesizeRequest(
                                txId[i],
                                emergencyParams.initialPortal,
                                emergencyParams.initialBridge,
                                emergencyParams.initialChainID,
                                emergencyParams.v,
                                emergencyParams.r,
                                emergencyParams.s
                            );
                        }
                    }
                    emit InconsistencyCallback(
                        params.exchange,
                        _pool[params.exchange].at(uint256(int256(params.i))),
                        params.to,
                        IERC20Upgradeable(_pool[params.exchange].at(uint256(int256(params.i)))).balanceOf(
                            address(this)
                        )
                    );
                    return;
                }
                //perform exhange
                IStableSwapPool(params.exchange).exchange(params.i, params.j, _dx, _min_dy);
            } catch {
                for (uint256 i = 0; i < txId.length; i++) {
                    if (synthAmount[i] > 0) {
                        ISynthesis(_synthesis).emergencyUnsyntesizeRequest(
                            txId[i],
                            emergencyParams.initialPortal,
                            emergencyParams.initialBridge,
                            emergencyParams.initialChainID,
                            emergencyParams.v,
                            emergencyParams.r,
                            emergencyParams.s
                        );
                    }
                }
                return;
            }
        }

        //remove liquidity one coin stage
        address _thisLpToken = _lpToken[params.remove];
        // IERC20Upgradeable(lpToken).approve(_params.remove, 0); //CurveV2 token support
        IERC20Upgradeable(_thisLpToken).approve(params.remove, IERC20Upgradeable(_thisLpToken).balanceOf(address(this)));

        uint256 _tokenAmount = IERC20Upgradeable(_thisLpToken).balanceOf(address(this));
        try IStableSwapPool(params.remove).calc_withdraw_one_coin(_tokenAmount, params.x) returns (uint256 _minAmount) {
            //inconsistency check
            if (params.expectedMinAmount > _minAmount) {
                for (uint256 i = 0; i < txId.length; i++) {
                    if (synthAmount[i] > 0) {
                        ISynthesis(_synthesis).emergencyUnsyntesizeRequest(
                            txId[i],
                            emergencyParams.initialPortal,
                            emergencyParams.initialBridge,
                            emergencyParams.initialChainID,
                            emergencyParams.v,
                            emergencyParams.r,
                            emergencyParams.s
                        );
                    }
                }
                emit InconsistencyCallback(params.remove, _thisLpToken, params.to, _tokenAmount);
                return;
            }
        } catch {
            for (uint256 i = 0; i < txId.length; i++) {
                if (synthAmount[i] > 0) {
                    ISynthesis(_synthesis).emergencyUnsyntesizeRequest(
                        txId[i],
                        emergencyParams.initialPortal,
                        emergencyParams.initialBridge,
                        emergencyParams.initialChainID,
                        emergencyParams.v,
                        emergencyParams.r,
                        emergencyParams.s
                    );
                }
            }
        }

        //remove liquidity
        try IStableSwapPool(params.remove).remove_liquidity_one_coin(_tokenAmount, params.x, 0) {
            //transfer asset to the recipient (unsynth if mentioned)
            uint256 _thisBalance = IERC20Upgradeable(_pool[params.remove].at(uint256(int256(params.x)))).balanceOf(
                address(this)
            );
            if (params.chainId != 0) {
                IERC20Upgradeable(_pool[params.remove].at(uint256(int256(params.x)))).approve(_synthesis, _thisBalance);
                ISynthesis.SynthParams memory synthParams = ISynthesis.SynthParams(
                    params.receiveSide,
                    params.oppositeBridge,
                    params.chainId
                );
                ISynthesis(_synthesis).burnSyntheticToken(
                    _pool[params.remove].at(uint256(int256(params.x))),
                    _thisBalance,
                    address(this),
                    params.to,
                    synthParams
                );
            } else {
                IERC20Upgradeable(_pool[params.remove].at(uint256(int256(params.x)))).safeTransfer(
                    params.to,
                    _thisBalance
                );
            }
        } catch {
            for (uint256 i = 0; i < txId.length; i++) {
                if (synthAmount[i] > 0) {
                    ISynthesis(_synthesis).emergencyUnsyntesizeRequest(
                        txId[i],
                        emergencyParams.initialPortal,
                        emergencyParams.initialBridge,
                        emergencyParams.initialChainID,
                        emergencyParams.v,
                        emergencyParams.r,
                        emergencyParams.s
                    );
                }
            }
        }
    }

    /**
     * @dev Redeem EUSD with unsynth operation (hub chain execution only)
     * @param params meta redeem EUSD params
     * @param permit permit params
     * @param receiveSide calldata recipient address for unsynth operation
     * @param oppositeBridge opposite bridge contract address
     * @param chainId opposite chain ID
     */
    function redeemEUSD(
        MetaRedeemEUSD calldata params,
        PermitData calldata permit,
        address receiveSide,
        address oppositeBridge,
        uint256 chainId
    ) external {
        {
            address _hubLpToken = _lpToken[params.removeAtHubPool];

            //process permit operation if mentioned
            if (permit.v != 0) {
                uint256 _approveValue = permit.approveMax ? uint256(2**256 - 1) : params.tokenAmountH;
                IERC20WithPermit(_hubLpToken).permit(
                    _msgSender(),
                    address(this),
                    _approveValue,
                    permit.deadline,
                    permit.v,
                    permit.r,
                    permit.s
                );
            }

            //hub pool remove_liquidity_one_coin stage
            // IERC20Upgradeable(hubLpToken).safeTransferFrom(_msgSender(), address(this), _params.tokenAmountH);
            registerNewBalance(_hubLpToken, params.tokenAmountH);
            // IERC20Upgradeable(hubLpToken).approve(_params.removeAtHubPool, 0); //CurveV2 token support
            IERC20Upgradeable(_hubLpToken).approve(params.removeAtHubPool, params.tokenAmountH);

            //inconsistency check
            uint256 _hubLpTokenBalance = IERC20Upgradeable(_hubLpToken).balanceOf(address(this));
            uint256 _minAmountsH = IStableSwapPool(params.removeAtHubPool).calc_withdraw_one_coin(
                params.tokenAmountH,
                params.y
            );

            if (params.expectedMinAmountH > _minAmountsH) {
                IERC20Upgradeable(_hubLpToken).safeTransfer(params.to, _hubLpTokenBalance);
                emit InconsistencyCallback(params.removeAtHubPool, _hubLpToken, params.to, _hubLpTokenBalance);

                return;
            }
            IStableSwapPool(params.removeAtHubPool).remove_liquidity_one_coin(params.tokenAmountH, params.y, 0);
        }
        {
            //crosschain pool remove_liquidity_one_coin stage
            uint256 _hubCoinBalance = IERC20Upgradeable(_pool[params.removeAtHubPool].at(uint256(int256(params.y))))
                .balanceOf(address(this));
            uint256 _min_amounts_c = IStableSwapPool(params.removeAtCrosschainPool).calc_withdraw_one_coin(
                _hubCoinBalance,
                params.x
            );

            //inconsistency check
            if (params.expectedMinAmountC > _min_amounts_c) {
                IERC20Upgradeable(_pool[params.removeAtCrosschainPool].at(uint256(int256(params.x)))).safeTransfer(
                    params.to,
                    _hubCoinBalance
                );
                emit InconsistencyCallback(
                    params.removeAtCrosschainPool,
                    _pool[params.removeAtCrosschainPool].at(uint256(int256(params.x))),
                    params.to,
                    _hubCoinBalance
                );
                return;
            }

            // IERC20Upgradeable(pool[_params.removeAtCrosschainPool].at(uint256(int256(_params.x)))).approve(_params.removeAtCrosschainPool, 0); //CurveV2 token support
            IERC20Upgradeable(_pool[params.removeAtCrosschainPool].at(uint256(int256(params.x)))).approve(
                params.removeAtCrosschainPool,
                _hubCoinBalance
            );
            IStableSwapPool(params.removeAtCrosschainPool).remove_liquidity_one_coin(_hubCoinBalance, params.x, 0);

            //transfer outcome to the recipient (unsynth if mentioned)
            uint256 _thisBalance = IERC20Upgradeable(_pool[params.removeAtCrosschainPool].at(uint256(int256(params.x))))
                .balanceOf(address(this));
            if (chainId != 0) {
                IERC20Upgradeable(_pool[params.removeAtCrosschainPool].at(uint256(int256(params.x)))).approve(
                    _synthesis,
                    _thisBalance
                );
                ISynthesis.SynthParams memory synthParams = ISynthesis.SynthParams(
                    receiveSide,
                    oppositeBridge,
                    chainId
                );
                ISynthesis(_synthesis).burnSyntheticToken(
                    _pool[params.removeAtCrosschainPool].at(uint256(int256(params.x))),
                    _thisBalance,
                    address(this),
                    params.to,
                    synthParams
                );
            } else {
                IERC20Upgradeable(_pool[params.removeAtCrosschainPool].at(uint256(int256(params.x)))).safeTransfer(
                    params.to,
                    _thisBalance
                );
            }
        }
    }
}
