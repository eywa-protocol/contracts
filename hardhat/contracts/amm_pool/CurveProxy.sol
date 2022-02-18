// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./RelayRecipient.sol";
import "./IStableSwapPool.sol";

interface IPortal {
    struct SynthParams {
        address chain2address;
        address receiveSide;
        address oppositeBridge;
        uint256 chainID;
    }

    function synthesize(
        address _token,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID
    ) external returns (bytes32 txID);

    function unsynthesize(
        bytes32 _txId,
        address _token,
        uint256 _amount,
        address _to
    ) external;

    function synthesize_transit(
        address _token,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID,
        bytes memory _out
    ) external returns (bytes32 txId);

    function synthesize_batch_transit(
        address[] memory _token,
        uint256[] memory _amounts,
        SynthParams memory _synth_params,
        bytes4 _selector,
        bytes memory _transit_data
    ) external;

    function getTxId() external returns (bytes32);

    function getTokenData(address _rtoken) external returns (bytes memory);
}

interface ISynthesis {
    function mintSyntheticToken(
        bytes32 _txId,
        address _tokenReal,
        uint256 _amount,
        address _to
    ) external;

    function burnSyntheticToken(
        address _stoken,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID
    ) external returns (bytes32 txID);

    function burnSyntheticToken_transit(
        address _stoken,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID,
        bytes memory _out
    ) external returns (bytes32 txId);

    function emergencyUnsyntesizeRequest(
        bytes32 _txID,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID
    ) external;

    function getRepresentation(bytes32 _rtoken) external view returns (address);

    function getTxId() external returns (bytes32);
}

//TODO: relocate
interface IERC20WithPermit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

contract CurveProxy is Initializable, RelayRecipient {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    string public versionRecipient;
    //pool_address => enumerable_token_set
    mapping(address => EnumerableSetUpgradeable.AddressSet) private pool;
    //pool_address => lp_token_address
    mapping(address => address) private lp_token;
    address public portal;
    address public synthesis;
    address public bridge;

    function initialize(
        address _forwarder,
        address _portal,
        address _synthesis,
        address _bridge
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        _setTrustedForwarder(_forwarder);
        portal = _portal;
        synthesis = _synthesis;
        bridge = _bridge;
        versionRecipient = "2.2.3";
    }

    struct PermitData {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 deadline;
        bool approveMax;
    }

    struct SynthParams {
        address chain2address;
        address receiveSide;
        address oppositeBridge;
        uint256 chainID;
    }

    struct AddLiquidity {
        address add;
        address to;
        uint256 expected_min_mint_amount;
    }

    struct MetaMintEUSD {
        //crosschain pool params
        address add_c;
        uint256 expected_min_mint_amount_c;
        //incoming coin index for adding liq to hub pool
        uint256 lp_index;
        //hub pool params
        address add_h;
        uint256 expected_min_mint_amount_h;
        //recipient address
        address to;
    }

    struct MetaRedeemEUSD {
        //crosschain pool params
        address remove_c;
        //outcome index
        int128 x;
        uint256 expected_min_amount_c;
        //hub pool params
        address remove_h;
        uint256 token_amount_h;
        //lp index
        int128 y;
        uint256 expected_min_amount_h;
        //recipient address
        address to;
    }

    struct MetaExchangeParams {
        //pool address
        address add;
        address exchange;
        address remove;
        //add liquidity params
        uint256 expected_min_mint_amount;
        //exchange params
        int128 i; //index value for the coin to send
        int128 j; //index value of the coin to receive
        uint256 expected_min_dy;
        //withdraw one coin params
        int128 x; //index value of the coin to withdraw
        uint256 expected_min_amount;
        //transfer to
        address to;
        //unsynth params
        address chain2address;
        address receiveSide;
        address oppositeBridge;
        uint256 chainID;
        //emergency unsynth params
        address receiverBridge;
        uint256 receiverChainID;
    }

    event InconsistencyCallback(address pool, address token, address to, uint256 amount);

    modifier onlyBridge() {
        require(bridge == _msgSender());
        _;
    }

    function setTrustedForwarder(address _forwarder) external onlyOwner {
        return _setTrustedForwarder(_forwarder);
    }

    /**
     * @dev Set the corresponding pool data to use proxy with
     * @param _pool pool address
     * @param _lp_token lp token address for the corresponding pool
     * @param _coins listed token addresses
     */
    function setPool(
        address _pool,
        address _lp_token,
        address[] calldata _coins
    ) public {
        for (uint256 i = 0; i < _coins.length; i++) {
            pool[_pool].add(_coins[i]);
        }
        lp_token[_pool] = _lp_token;
    }

    /**
     * @dev Transit synth batch and add liquidity to the 3pool
     * @param _params add liquidity params
     * @param _synth_token tokens to synth from an external chain
     * @param _synth_amount amounts to synth from an external chain
     * @param _txId synth transaction IDs
     */
    function transit_synth_batch_add_liquidity_3pool(
        AddLiquidity calldata _params,
        address[3] calldata _synth_token,
        uint256[3] calldata _synth_amount,
        bytes32[3] calldata _txId
    ) external onlyBridge {
        address[3] memory representation;

        //synthesize stage
        for (uint256 i = 0; i < _txId.length; i++) {
            representation[i] = ISynthesis(synthesis).getRepresentation(bytes32(uint256(uint160(_synth_token[i]))));
            if (_synth_amount[i] > 0) {
                ISynthesis(synthesis).mintSyntheticToken(_txId[i], _synth_token[i], _synth_amount[i], address(this));
                IERC20Upgradeable(representation[i]).approve(_params.add, _synth_amount[i]);
            }
        }

        //add liquidity stage
        uint256 min_mint_amount = IStableSwapPool(_params.add).calc_token_amount(_synth_amount, true);

        //inconsistency check
        if (_params.expected_min_mint_amount > min_mint_amount) {
            for (uint256 i = 0; i < representation.length; i++) {
                if (_synth_amount[i] > 0) {
                    IERC20Upgradeable(representation[i]).safeTransfer(_params.to, _synth_amount[i]);
                    emit InconsistencyCallback(_params.add, representation[i], _params.to, _synth_amount[i]);
                }
            }
            return;
        }

        //add liquidity
        IStableSwapPool(_params.add).add_liquidity(_synth_amount, 0);

        //transfer asset to the recipient
        IERC20Upgradeable(lp_token[_params.add]).safeTransfer(
            _params.to,
            IERC20Upgradeable(lp_token[_params.add]).balanceOf(address(this))
        );
    }

    /**
     * @dev Mint EUSD local case (hub chain only)
     * @param _params MetaMintEUSD params
     * @param _permit permit operation params
     * @param _token token addresses
     * @param _amount amounts to transfer
     */
    function add_liquidity_3pool_mint_eusd(
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
                IERC20Upgradeable(_token[i]).safeTransferFrom(_msgSender(), address(this), _amount[i]);
                IERC20Upgradeable(_token[i]).approve(_params.add_c, _amount[i]);
            }
        }

        //add liquidity stage
        uint256 min_mint_amount_c = IStableSwapPool(_params.add_c).calc_token_amount(_amount, true);

        //inconsistency check
        if (_params.expected_min_mint_amount_c > min_mint_amount_c) {
            for (uint256 i = 0; i < _token.length; i++) {
                if (_amount[i] > 0) {
                    IERC20Upgradeable(_token[i]).safeTransfer(_params.to, _amount[i]);
                    emit InconsistencyCallback(_params.add_c, _token[i], _params.to, _amount[i]);
                }
            }
            return;
        }

        //add liquidity
        IStableSwapPool(_params.add_c).add_liquidity(_amount, 0);

        //HUB STAGE (3pool only)
        IERC20Upgradeable(lp_token[_params.add_c]).approve(
            _params.add_h,
            IERC20Upgradeable(lp_token[_params.add_c]).balanceOf(address(this))
        );
        uint256[3] memory amount_h;
        amount_h[_params.lp_index] = IERC20Upgradeable(lp_token[_params.add_c]).balanceOf(address(this));

        //add liquidity hub stage
        uint256 min_mint_amount_h = IStableSwapPool(_params.add_h).calc_token_amount(_amount, true);
        //inconsistency check hub stage
        if (_params.expected_min_mint_amount_h > min_mint_amount_h) {
            //TODO
            IERC20Upgradeable(lp_token[_params.add_h]).safeTransfer(_params.to, amount_h[_params.lp_index]);
            emit InconsistencyCallback(_params.add_h, lp_token[_params.add_h], _params.to, amount_h[_params.lp_index]);
            return;
        }

        //add liquidity
        IStableSwapPool(_params.add_h).add_liquidity(amount_h, 0);

        //transfer EUSD to the recipient
        uint256 thisBalance = IERC20Upgradeable(lp_token[_params.add_h]).balanceOf(address(this));
        IERC20Upgradeable(lp_token[_params.add_h]).safeTransfer(_params.to, thisBalance);
    }

    /**
     * @dev Mint EUSD from external chains
     * @param _params meta mint EUSD params
     * @param _synth_token tokens to synth from an external chain
     * @param _synth_amount amounts to synth from an external chain
     * @param _txId transaction IDs
     */
    function transit_synth_batch_add_liquidity_3pool_mint_eusd(
        MetaMintEUSD calldata _params,
        address[3] calldata _synth_token,
        uint256[3] calldata _synth_amount,
        bytes32[3] calldata _txId
    ) external onlyBridge {
        address[3] memory representation;

        //synthesize stage
        for (uint256 i = 0; i < _txId.length; i++) {
            representation[i] = ISynthesis(synthesis).getRepresentation(bytes32(uint256(uint160(_synth_token[i]))));
            if (_synth_amount[i] > 0) {
                ISynthesis(synthesis).mintSyntheticToken(_txId[i], _synth_token[i], _synth_amount[i], address(this));
                IERC20Upgradeable(representation[i]).approve(_params.add_c, _synth_amount[i]);
            }
        }

        //add liquidity crosschain stage
        uint256 min_mint_amount_c = IStableSwapPool(_params.add_c).calc_token_amount(_synth_amount, true);

        //inconsistency check
        if (_params.expected_min_mint_amount_c > min_mint_amount_c) {
            for (uint256 i = 0; i < representation.length; i++) {
                if (_synth_amount[i] > 0) {
                    IERC20Upgradeable(representation[i]).safeTransfer(_params.to, _synth_amount[i]);
                    emit InconsistencyCallback(_params.add_c, representation[i], _params.to, _synth_amount[i]);
                }
            }
            return;
        }

        //add liquidity to the crosschain pool
        IStableSwapPool(_params.add_c).add_liquidity(_synth_amount, 0);

        //HUB STAGE (3pool only)
        IERC20Upgradeable(lp_token[_params.add_c]).approve(
            _params.add_h,
            IERC20Upgradeable(lp_token[_params.add_c]).balanceOf(address(this))
        );
        uint256[3] memory amount_h;
        amount_h[_params.lp_index] = IERC20Upgradeable(lp_token[_params.add_c]).balanceOf(address(this));

        //add liquidity hub stage
        uint256 min_mint_amount_h = IStableSwapPool(_params.add_h).calc_token_amount(_synth_amount, true);
        //inconsistency check hub stage
        if (_params.expected_min_mint_amount_h > min_mint_amount_h) {
            //TODO: check index
            IERC20Upgradeable(lp_token[_params.add_h]).safeTransfer(_params.to, amount_h[_params.lp_index]);
            emit InconsistencyCallback(_params.add_h, lp_token[_params.add_h], _params.to, amount_h[_params.lp_index]);
            return;
        }

        //add liquidity
        IStableSwapPool(_params.add_h).add_liquidity(amount_h, 0);

        //transfer EUSD to the recipient
        uint256 thisBalance = IERC20Upgradeable(lp_token[_params.add_h]).balanceOf(address(this));
        IERC20Upgradeable(lp_token[_params.add_h]).safeTransfer(_params.to, thisBalance);
    }

    /**
     * @dev Meta exchange local case (hub chain execution only)
     * @param _params meta exchange params
     * @param _permit permit operation params
     * @param _token token addresses to transfer within initial stage
     * @param _amount amounts to transfer within initial stage
     */
    function meta_exchange(
        MetaExchangeParams calldata _params,
        PermitData[] calldata _permit,
        address[3] calldata _token,
        uint256[3] calldata _amount
    ) external {
        {
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
                    IERC20Upgradeable(_token[i]).safeTransferFrom(_msgSender(), address(this), _amount[i]);
                    IERC20Upgradeable(_token[i]).approve(_params.add, _amount[i]);
                }
            }

            //add liquidity stage
            uint256 min_mint_amount = IStableSwapPool(_params.add).calc_token_amount(_amount, true);
            //inconsistency check
            if (_params.expected_min_mint_amount > min_mint_amount) {
                for (uint256 i = 0; i < _token.length; i++) {
                    if (_amount[i] > 0) {
                        IERC20Upgradeable(_token[i]).safeTransfer(_params.to, _amount[i]);
                        emit InconsistencyCallback(_params.add, _token[i], _params.to, _amount[i]);
                    }
                }
                return;
            }

            //add liquidity
            IStableSwapPool(_params.add).add_liquidity(_amount, 0);
        }
        //meta-exchange stage
        {
            address lpLocalPool = lp_token[_params.add];

            // IERC20Upgradeable(lpLocalPool).approve(_params.exchange, 0); //CurveV2 token support
            IERC20Upgradeable(lpLocalPool).approve(
                _params.exchange,
                IERC20Upgradeable(lpLocalPool).balanceOf(address(this))
            );

            uint256 dx = IERC20Upgradeable(lpLocalPool).balanceOf(address(this)); //amount to swap
            uint256 min_dy = IStableSwapPool(_params.exchange).get_dy(_params.i, _params.j, dx);

            //inconsistency check
            if (_params.expected_min_dy > min_dy) {
                IERC20Upgradeable(pool[_params.exchange].at(uint256(int256(_params.i)))).safeTransfer(
                    _params.to,
                    IERC20Upgradeable(pool[_params.exchange].at(uint256(int256(_params.i)))).balanceOf(address(this))
                );
                emit InconsistencyCallback(
                    _params.exchange,
                    pool[_params.exchange].at(uint256(int256(_params.i))),
                    _params.to,
                    IERC20Upgradeable(pool[_params.exchange].at(uint256(int256(_params.i)))).balanceOf(address(this))
                );
                return;
            }

            //perform an exhange
            IStableSwapPool(_params.exchange).exchange(_params.i, _params.j, dx, min_dy);
        }

        //remove liquidity one coin stage
        address lpToken = lp_token[_params.remove];
        // IERC20Upgradeable(lpToken).approve(_params.remove, 0); //CurveV2 token support
        IERC20Upgradeable(lpToken).approve(_params.remove, IERC20Upgradeable(lpToken).balanceOf(address(this)));

        uint256 token_amount = IERC20Upgradeable(lpToken).balanceOf(address(this));
        uint256 min_amount = IStableSwapPool(_params.remove).calc_withdraw_one_coin(token_amount, _params.x);

        //inconsistency check
        if (_params.expected_min_amount > min_amount) {
            IERC20Upgradeable(lpToken).safeTransfer(_params.to, token_amount);
            emit InconsistencyCallback(_params.remove, lpToken, _params.to, token_amount);
            return;
        }

        //remove liquidity
        IStableSwapPool(_params.remove).remove_liquidity_one_coin(token_amount, _params.x, 0);

        //transfer asset to the recipient (unsynth if mentioned)
        uint256 thisBalance = IERC20Upgradeable(pool[_params.remove].at(uint256(int256(_params.x)))).balanceOf(
            address(this)
        );
        if (_params.chainID != 0) {
            IERC20Upgradeable(pool[_params.remove].at(uint256(int256(_params.x)))).approve(synthesis, thisBalance);
            ISynthesis(synthesis).burnSyntheticToken(
                pool[_params.remove].at(uint256(int256(_params.x))),
                thisBalance,
                _params.to,
                _params.receiveSide,
                _params.oppositeBridge,
                _params.chainID
            );
        } else {
            IERC20Upgradeable(pool[_params.remove].at(uint256(int256(_params.x)))).safeTransfer(
                _params.to,
                thisBalance
            );
        }
    }

    /**
     * @dev Performs a meta exchange on request from external chains
     * @param _params meta exchange params
     * @param _synth_token tokens to synth from an external chain
     * @param _synth_amount amounts to synth from an external chain
     * @param _txId synth transaction IDs
     */
    function transit_synth_batch_meta_exchange(
        MetaExchangeParams calldata _params,
        address[3] calldata _synth_token,
        uint256[3] calldata _synth_amount,
        bytes32[3] calldata _txId
    ) external onlyBridge {
        address[3] memory representation;

        //synthesize stage
        for (uint256 i = 0; i < _txId.length; i++) {
            representation[i] = ISynthesis(synthesis).getRepresentation(bytes32(uint256(uint160(_synth_token[i]))));
            if (_synth_amount[i] > 0) {
                ISynthesis(synthesis).mintSyntheticToken(
                     _txId[i],
                    _synth_token[i],
                    _synth_amount[i],
                    address(this)
                );
                IERC20Upgradeable(representation[i]).approve(_params.add, _synth_amount[i]);
            }
        }
        //add liquidity stage
        try IStableSwapPool(_params.add).calc_token_amount(_synth_amount, true) returns(uint256 min_mint_amount) {
            //inconsistency check
            if (_params.expected_min_mint_amount > min_mint_amount) {
                for (uint256 i = 0; i < representation.length; i++) {
                    if (_synth_amount[i] > 0) {
                        ISynthesis(synthesis).emergencyUnsyntesizeRequest(_txId[i],_params.to, _params.receiverBridge, _params.receiverChainID);
                        emit InconsistencyCallback(_params.add, representation[i], _params.to, _synth_amount[i]);
                    }
                }
                return;
            }
        } catch {
            for (uint256 i = 0; i < representation.length; i++) {
                ISynthesis(synthesis).emergencyUnsyntesizeRequest(_txId[i],_params.to, _params.receiverBridge, _params.receiverChainID);
            }
            return;
        }

        //add liquidity
        try IStableSwapPool(_params.add).add_liquidity(_synth_amount, 0) {
            //meta-exchange stage
            address lpLocalPool = lp_token[_params.add];

            // IERC20Upgradeable(lpLocalPool).approve(_params.exchange, 0); //CurveV2 token support
            IERC20Upgradeable(lpLocalPool).approve(
                _params.exchange,
                IERC20Upgradeable(lpLocalPool).balanceOf(address(this))
            );

            uint256 dx = IERC20Upgradeable(lpLocalPool).balanceOf(address(this)); //amount to swap

            try IStableSwapPool(_params.exchange).get_dy(_params.i, _params.j, dx) returns (uint256 min_dy) {
                //inconsistency check
                if (_params.expected_min_dy > min_dy) {
                    for (uint256 i = 0; i < _txId.length; i++) {
                        ISynthesis(synthesis).emergencyUnsyntesizeRequest(_txId[i],_params.to, _params.receiverBridge, _params.receiverChainID);
                        emit InconsistencyCallback(
                            _params.exchange,
                            pool[_params.exchange].at(uint256(int256(_params.i))),
                            _params.to,
                            IERC20Upgradeable(pool[_params.exchange].at(uint256(int256(_params.i)))).balanceOf(address(this))
                        );
                    }
                    return;
                }
            } catch {
                for (uint256 i = 0; i < representation.length; i++) {
                    ISynthesis(synthesis).emergencyUnsyntesizeRequest(_txId[i],_params.to, _params.receiverBridge, _params.receiverChainID);
                }
                return;
            }

            
        } catch {
            for (uint256 i = 0; i < representation.length; i++) {
                ISynthesis(synthesis).emergencyUnsyntesizeRequest(_txId[i],_params.to, _params.receiverBridge, _params.receiverChainID);
            }
            return;
        }
        //perform exhange
        try IStableSwapPool(_params.exchange).exchange(_params.i, _params.j, dx, min_dy) {
            //remove liquidity one coin stage
            address lpToken = lp_token[_params.remove];
            // IERC20Upgradeable(lpToken).approve(_params.remove, 0); //CurveV2 token support
            IERC20Upgradeable(lpToken).approve(_params.remove, IERC20Upgradeable(lpToken).balanceOf(address(this)));

            uint256 token_amount = IERC20Upgradeable(lpToken).balanceOf(address(this));
            try IStableSwapPool(_params.remove).calc_withdraw_one_coin(token_amount, _params.x) returns(uint256 min_amount) {
                //inconsistency check
                if (_params.expected_min_amount > min_amount) {
                    for (uint256 i = 0; i < _txId.length; i++) {
                        ISynthesis(synthesis).emergencyUnsyntesizeRequest(_txId[i],_params.to, _params.receiverBridge, _params.receiverChainID);
                        emit InconsistencyCallback(_params.remove, lpToken, _params.to, token_amount);
                    }
                    return;
                }
            } catch {
                for (uint256 i = 0; i < representation.length; i++) {
                ISynthesis(synthesis).emergencyUnsyntesizeRequest(_txId[i],_params.to, _params.receiverBridge, _params.receiverChainID);
                }
                return;
            }
            //remove liquidity
            try IStableSwapPool(_params.remove).remove_liquidity_one_coin(token_amount, _params.x, 0) {

                //transfer asset to the recipient (unsynth if mentioned)
                uint256 thisBalance = IERC20Upgradeable(pool[_params.remove].at(uint256(int256(_params.x)))).balanceOf(
                    address(this)
                );
                if (_params.chainID != 0) {
                    IERC20Upgradeable(pool[_params.remove].at(uint256(int256(_params.x)))).approve(synthesis, thisBalance);
                    ISynthesis(synthesis).burnSyntheticToken(
                        pool[_params.remove].at(uint256(int256(_params.x))),
                        thisBalance,
                        _params.to,
                        _params.receiveSide,
                        _params.oppositeBridge,
                        _params.chainID
                    );
                } else {
                    IERC20Upgradeable(pool[_params.remove].at(uint256(int256(_params.x)))).safeTransfer(
                        _params.to,
                        thisBalance
                    );
                }
            } catch {
                for (uint256 i = 0; i < representation.length; i++) {
                    ISynthesis(synthesis).emergencyUnsyntesizeRequest(_txId[i],_params.to, _params.receiverBridge, _params.receiverChainID);
                }
                return;
            }
        } catch {
            for (uint256 i = 0; i < representation.length; i++) {
                ISynthesis(synthesis).emergencyUnsyntesizeRequest(_txId[i],_params.to, _params.receiverBridge, _params.receiverChainID);
            }
            return;
        }
    }

    /**
     * @dev Redeem EUSD with unsynth operation (hub chain execution only)
     * @param _params meta redeem EUSD params
     * @param _permit permit params
     * @param _receiveSide calldata recipient address for unsynth operation
     * @param _oppositeBridge opposite bridge contract address
     * @param _chainID opposite chain ID
     */
    function redeem_eusd(
        MetaRedeemEUSD calldata _params,
        PermitData calldata _permit,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID
    ) external {
        {
            address hubLpToken = lp_token[_params.remove_h];

            //process permit operation if mentioned
            if (_permit.v != 0) {
                uint256 approveValue = _permit.approveMax ? uint256(2**256 - 1) : _params.token_amount_h;
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
            IERC20Upgradeable(hubLpToken).safeTransferFrom(_msgSender(), address(this), _params.token_amount_h);
            // IERC20Upgradeable(hubLpToken).approve(_params.remove_h, 0); //CurveV2 token support
            IERC20Upgradeable(hubLpToken).approve(_params.remove_h, _params.token_amount_h);

            //inconsistency check
            uint256 hubLpTokenBalance = IERC20Upgradeable(hubLpToken).balanceOf(address(this));
            uint256 min_amounts_h = IStableSwapPool(_params.remove_h).calc_withdraw_one_coin(
                _params.token_amount_h,
                _params.y
            );

            if (_params.expected_min_amount_h > min_amounts_h) {
                IERC20Upgradeable(hubLpToken).safeTransfer(_params.to, hubLpTokenBalance);
                emit InconsistencyCallback(_params.remove_h, hubLpToken, _params.to, hubLpTokenBalance);

                return;
            }
            IStableSwapPool(_params.remove_h).remove_liquidity_one_coin(_params.token_amount_h, _params.y, 0);
        }
        {
            //crosschain pool remove_liquidity_one_coin stage
            uint256 hubCoinBalance = IERC20Upgradeable(pool[_params.remove_h].at(uint256(int256(_params.y)))).balanceOf(
                address(this)
            );
            uint256 min_amounts_c = IStableSwapPool(_params.remove_c).calc_withdraw_one_coin(hubCoinBalance, _params.x);

            //inconsistency check
            if (_params.expected_min_amount_c > min_amounts_c) {
                IERC20Upgradeable(pool[_params.remove_c].at(uint256(int256(_params.x)))).safeTransfer(
                    _params.to,
                    hubCoinBalance
                );
                emit InconsistencyCallback(
                    _params.remove_c,
                    pool[_params.remove_c].at(uint256(int256(_params.x))),
                    _params.to,
                    hubCoinBalance
                );
                return;
            }

            // IERC20Upgradeable(pool[_params.remove_c].at(uint256(int256(_params.x)))).approve(_params.remove_c, 0); //CurveV2 token support
            IERC20Upgradeable(pool[_params.remove_c].at(uint256(int256(_params.x)))).approve(
                _params.remove_c,
                hubCoinBalance
            );
            IStableSwapPool(_params.remove_c).remove_liquidity_one_coin(hubCoinBalance, _params.x, 0);

            //transfer outcome to the recipient (unsynth if mentioned)
            uint256 thisBalance = IERC20Upgradeable(pool[_params.remove_c].at(uint256(int256(_params.x)))).balanceOf(
                address(this)
            );
            if (_chainID != 0) {
                IERC20Upgradeable(pool[_params.remove_c].at(uint256(int256(_params.x)))).approve(
                    synthesis,
                    thisBalance
                );
                ISynthesis(synthesis).burnSyntheticToken(
                    pool[_params.remove_c].at(uint256(int256(_params.x))),
                    thisBalance,
                    _params.to,
                    _receiveSide,
                    _oppositeBridge,
                    _chainID
                );
            } else {
                IERC20Upgradeable(pool[_params.remove_c].at(uint256(int256(_params.x)))).safeTransfer(
                    _params.to,
                    thisBalance
                );
            }
        }
    }
}
