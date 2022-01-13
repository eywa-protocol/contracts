// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-newone/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-newone/access/Ownable.sol";
import "../utils/@opengsn/contracts/src/BaseRelayRecipient.sol";
import "./IStableSwapPool.sol";

import "hardhat/console.sol";

interface IPortal {
    struct SynthParams {
        address chain2address;
        address receiveSide;
        address oppositeBridge;
        uint256 chainID;
    }

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

    function burnSyntheticToken_transit(
        address _stoken,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID,
        bytes memory _out
    ) external returns (bytes32 txId);

    function getRepresentation(bytes32 _rtoken) external view returns (address);

    function getTxId() external returns (bytes32);
}

contract CurveProxy is BaseRelayRecipient {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    //pool_address => enumerable_token_set
    mapping(address => EnumerableSet.AddressSet) private pool;
    //pool_address => lp_token_address
    mapping(address => address) private lp_token;
    address portal;
    address synthesis;
    address bridge;

    constructor(
        address _forwarder,
        address _portal,
        address _synthesis,
        address _bridge
    ) {
        _setTrustedForwarder(_forwarder);
        portal = _portal;
        synthesis = _synthesis;
        bridge = _bridge;
    }

    struct SynthParams {
        address chain2address;
        address receiveSide;
        address oppositeBridge;
        uint256 chainID;
    }

    struct AddLiquidity3Pool {
        address add;
        address to;
        uint256 expected_min_mint_amount;
    }

    struct MetaExchangeParams {
        //pool address
        address exchange;
        address remove;
        //exchange params
        uint128 i; //index value for the coin to send
        uint128 j; //index value of the coin to receive
        uint256 expected_min_dy;
        //withdraw one coin params
        uint128 x; // index value of the coin to withdraw
        uint256 expected_min_amount;
        //transfer to
        address to;
        //unsynth params
        address unsynth_token;
        address chain2address;
        address receiveSide;
        address oppositeBridge;
        uint256 chainID;
    }

    struct MetaExchangeParamsETH {
        //pool address
        address add;
        address exchange;
        address remove;
        //add liquidity params
        uint256 expected_min_mint_amount;
        //exchange params
        uint128 i; //index value for the coin to send
        uint128 j; //index value of the coin to receive
        uint256 expected_min_dy;
        //withdraw one coin params
        uint128 x; // index value of the coin to withdraw
        uint256 expected_min_amount;
        //transfer to
        address to;
        //unsynth params
        address unsynth_token;
        address chain2address;
        address receiveSide;
        address oppositeBridge;
        uint256 chainID;
    }

    event InconsistencyCallback(address pool, address token, address to, uint256 amount);

    modifier onlyBridge() {
        require(bridge == _msgSender());
        _;
    }

    // TODO onlyOwner
    function setTrustedForwarder(address _forwarder) external {
       return _setTrustedForwarder(_forwarder);
    }

    ///@dev Set the corresponding pool data to use proxy with
    ///@param _pool pool address
    ///@param _lp_token lp token address for the corresponding  pool
    ///@param _coins listed token addresses
    /////////////////////////////////////////////////////////////
    function setPool(
        address _pool,
        address _lp_token,
        address[] memory _coins
    ) public {
        for (uint256 i = 0; i < _coins.length; i++) {
            pool[_pool].add(_coins[i]);
        }
        lp_token[_pool] = _lp_token;
    }

    ///@dev Meta exhcange stage(A).
    ///@param _add pool address
    ///@param _amounts list of amounts of coins to deposit
    ///@param _min_mint_amount minimum amount of LP tokens to mint from the deposit
    ///@param _synth_params synth params
    ///@param _selector proxy function selector
    ///@param _transit_data encoded data for transition
    /////////////////////////////////////////////////////////////
    function add_liquidity_3pool_transit_synthesize(
        address _add,
        uint256[3] memory _amounts,
        uint256 _min_mint_amount,
        SynthParams memory _synth_params,
        bytes4 _selector,
        bytes memory _transit_data
    ) external {
        //add_liquidity_3pool
        for (uint256 i = 0; i < _amounts.length; i++) {
            if (_amounts[i] > 0) {
                IERC20(pool[_add].at(i)).safeTransferFrom(_msgSender(), address(this), _amounts[i]);
                IERC20(pool[_add].at(i)).approve(address(_add), _amounts[i]);
            }
        }
        IStableSwapPool(_add).add_liquidity(_amounts, _min_mint_amount);

        //approve LP for Portal
        address lp = lp_token[_add];
        uint256 this_balance = IERC20(lp).balanceOf(address(this));
        IERC20(lp).approve(portal, 0);  // CurveV2 token support
        IERC20(lp).approve(portal, this_balance);

        //pack synthesize request with transit
        bytes memory out = abi.encodePacked(
            _selector,
            _transit_data,
            abi.encode(lp, this_balance, IPortal(portal).getTxId())
        );

        // transit meta request
        IPortal(portal).synthesize_transit(
            lp,
            this_balance, //amount to synthesize
            ////////////////////////////
            _synth_params.chain2address,
            _synth_params.receiveSide,
            _synth_params.oppositeBridge,
            _synth_params.chainID,
            out
        );
    }

    function add_liquidity_3pool_transit_synthesize_batch(
        address _add,
        uint256[3] memory _amounts,
        uint256 _min_mint_amount,
        SynthParams memory _synth_params,
        uint8[2] memory _opposite_pool_numbers, // [0]pool_size, [1]coin_index
        bytes4 _selector,
        bytes memory _transit_data
    ) external {
        //add_liquidity_3pool
        for (uint256 i = 0; i < _amounts.length; i++) {
            if (_amounts[i] > 0) {
                IERC20(pool[_add].at(i)).safeTransferFrom(_msgSender(), address(this), _amounts[i]);
                IERC20(pool[_add].at(i)).approve(address(_add), _amounts[i]);
            }
        }
        IStableSwapPool(_add).add_liquidity(_amounts, _min_mint_amount);

        // {
        address[] memory synth_token = new address[](_opposite_pool_numbers[0]);
        uint256[] memory synth_amount = new uint256[](_opposite_pool_numbers[0]);

        //approve LP for Portal
        synth_token[_opposite_pool_numbers[1]] = lp_token[_add];
        synth_amount[_opposite_pool_numbers[1]] = IERC20(synth_token[_opposite_pool_numbers[1]]).balanceOf(
            address(this)
        );
        IERC20(synth_token[_opposite_pool_numbers[1]]).approve(portal, 0);  // CurveV2 token support
        IERC20(synth_token[_opposite_pool_numbers[1]]).approve(portal, synth_amount[_opposite_pool_numbers[1]]);

        // synthesize batch transit => transit_synth_add_liquidity_[_opposite_pool_numbers[0]]pool
        IPortal(portal).synthesize_batch_transit(
            synth_token,
            synth_amount, //amount to synthesize
            ////////////////////////////
            IPortal.SynthParams(
                _synth_params.chain2address,
                _synth_params.receiveSide,
                _synth_params.oppositeBridge,
                _synth_params.chainID
            ),
            _selector,
            _transit_data
        );
        // }
    }

    ///@dev Meta exhcange stage(B).
    ///@param _params meta exchange params
    ///@param _synth_token token address to synth
    ///@param _synth_amount amount to synth
    ///@param _txId transaction ID
    /////////////////////////////////////////////////////////////
    function transit_meta_exchange(
        MetaExchangeParams memory _params,
        address _synth_token,
        uint256 _synth_amount,
        bytes32 _txId
    ) external onlyBridge {
        {
            // synthesize stage
            ISynthesis(synthesis).mintSyntheticToken(_txId, _synth_token, _synth_amount, address(this));

            //exchange stage
            address representation = ISynthesis(synthesis).getRepresentation(bytes32(uint256(uint160(_synth_token))));
            IERC20(representation).approve(_params.exchange, 0);
            IERC20(representation).approve(_params.exchange, IERC20(representation).balanceOf(address(this)));

            uint256 dx = IERC20(representation).balanceOf(address(this)); //amount to swap
            uint256 min_dy = IStableSwapPool(_params.exchange).get_dy(_params.i, _params.j, dx);

            // inconsistency check
            if (_params.expected_min_dy > min_dy) {
                IERC20(pool[_params.exchange].at(_params.i)).safeTransfer(
                    _params.to,
                    IERC20(pool[_params.exchange].at(_params.i)).balanceOf(address(this))
                );
                emit InconsistencyCallback(
                    _params.exchange,
                    pool[_params.exchange].at(_params.i),
                    _params.to,
                    IERC20(pool[_params.exchange].at(_params.i)).balanceOf(address(this))
                );
                return;
            }

            // perform exhange
            IStableSwapPool(_params.exchange).exchange(_params.i, _params.j, dx, min_dy);
        }
        // initiates unsynthesize request if mentioned
        if (_params.receiveSide != address(0)) {
            address representation = ISynthesis(synthesis).getRepresentation(
                bytes32(uint256(uint160(_params.unsynth_token)))
            );
            uint256 unsynth_amount = IERC20(representation).balanceOf(address(this));

            bytes memory out = abi.encodeWithSelector(
                bytes4(
                    keccak256(
                        "transit_unsynth_remove_liquidity_one_coin(address,uint256,address,int128,uint256,address,bytes32)"
                    )
                ),
                _params.unsynth_token,
                unsynth_amount,
                _params.remove,
                _params.x,
                _params.expected_min_amount,
                _params.to,
                ISynthesis(synthesis).getTxId()
            );

            ISynthesis(synthesis).burnSyntheticToken_transit(
                representation,
                unsynth_amount,
                ///////////////////////
                _params.chain2address, // need to delete!!!!!
                _params.receiveSide,
                _params.oppositeBridge,
                _params.chainID,
                out
            );

            return;
        } else {
            //remove liquidity one coin stage
            address lpToken = lp_token[_params.remove];
            IERC20(lpToken).approve(_params.remove, 0);  // CurveV2 token support
            IERC20(lpToken).approve(_params.remove, IERC20(lpToken).balanceOf(address(this)));

            uint256 token_amount = IERC20(lpToken).balanceOf(address(this));
            uint256 min_amount = IStableSwapPool(_params.remove).calc_withdraw_one_coin(token_amount, _params.x);

            // inconsistency check
            if (_params.expected_min_amount > min_amount) {
                IERC20(lpToken).safeTransfer(_params.to, token_amount);
                emit InconsistencyCallback(_params.remove, lpToken, _params.to, token_amount);
                return;
            }

            // remove liquidity
            IStableSwapPool(_params.remove).remove_liquidity_one_coin(token_amount, _params.x, min_amount);

            // transfer asset to the recipient
            IERC20(pool[_params.remove].at(_params.x)).safeTransfer(
                _params.to,
                IERC20(pool[_params.remove].at(_params.x)).balanceOf(address(this))
            );
            /////////test
            uint256 test = IERC20(pool[_params.remove].at(_params.x)).balanceOf(_params.to);
            console.log("address %s %s", _params.to, test);
        }
    }

    ///@dev Meta exhcange stage(C).
    ///@param _token token address to unsynth
    ///@param _amount amount to unsynth
    ///@param _remove pool address to perform withdraw on
    ///@param _x token address for withdraw
    ///@param _expected_min_amount expected amount to withdraw
    ///@param _to recipient address
    ///@param _txId transaction ID
    /////////////////////////////////////////////////////////////
    function transit_unsynth_remove_liquidity_one_coin(
        address _token,
        uint256 _amount,
        address _remove,
        uint128 _x,
        uint256 _expected_min_amount,
        address _to,
        bytes32 _txId
    ) external onlyBridge {
        //unsynthesize
        IPortal(portal).unsynthesize(_txId, _token, _amount, address(this));

        //remove liquidity one coin
        IERC20(_token).approve(_remove, 0);  // CurveV2 token support
        IERC20(_token).approve(_remove, IERC20(_token).balanceOf(address(this)));

        uint256 token_amount = IERC20(_token).balanceOf(address(this));
        uint256 min_amount = IStableSwapPool(_remove).calc_withdraw_one_coin(token_amount, _x);

        if (_expected_min_amount > min_amount) {
            IERC20(_token).safeTransfer(_to, token_amount);
            emit InconsistencyCallback(_remove, _token, _to, token_amount);
            return;
        }

        IStableSwapPool(_remove).remove_liquidity_one_coin(token_amount, _x, min_amount);

        // transfer asset to the recipient
        IERC20(pool[_remove].at(_x)).safeTransfer(
            _to,
            IERC20(pool[_remove].at(_x)).balanceOf(address(this))
        );
    }

    ///@dev transit synth batch and add liquidity to the 3pool.
    ///@param _params add liquidity 3Pool params
    ///@param _synth_token tokens to synth
    ///@param _synth_amount amounts to synth
    ///@param _txId transaction IDs
    /////////////////////////////////////////////////////////////
    function transit_synth_batch_add_liquidity_3pool(
        AddLiquidity3Pool memory _params,
        address[3] memory _synth_token,
        uint256[3] memory _synth_amount,
        bytes32[3] memory _txId
    ) external onlyBridge {
        address[3] memory representation;

        //synthesize stage
        for (uint256 i = 0; i < _txId.length; i++) {
            representation[i] = ISynthesis(synthesis).getRepresentation(bytes32(uint256(uint160(_synth_token[i]))));
            if (_synth_amount[i] > 0) {
                ISynthesis(synthesis).mintSyntheticToken(_txId[i], _synth_token[i], _synth_amount[i], address(this));
                // representation[i] = ISynthesis(synthesis).getRepresentation(_synth_token[i]);
                IERC20(representation[i]).approve(_params.add, _synth_amount[i]);
            } else {
                _synth_amount[i] = 0;
            }
        }

        //add liquidity stage
        uint256 min_mint_amount = IStableSwapPool(_params.add).calc_token_amount(_synth_amount, true);

        // inconsistency check
        if (_params.expected_min_mint_amount > min_mint_amount) {
            for (uint256 i = 0; i < representation.length; i++) {
                if (_synth_amount[i] > 0) {
                    IERC20(representation[i]).safeTransfer(_params.to, _synth_amount[i]);
                    emit InconsistencyCallback(_params.add, representation[i], _params.to, _synth_amount[i]);
                }
            }
            return;
        }

        // add liquidity
        IStableSwapPool(_params.add).add_liquidity(_synth_amount, 0);

        //transfer asset to the recipient
        IERC20(lp_token[_params.add]).safeTransfer(_params.to, IERC20(lp_token[_params.add]).balanceOf(address(this)));
    }

    function transit_synth_batch_meta_exchange_eth(
        MetaExchangeParamsETH memory _params,
        address[3] memory _synth_token,
        uint256[3] memory _synth_amount,
        bytes32[3] memory _txId
    ) external onlyBridge {
        {
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
                    // representation[i] = ISynthesis(synthesis).getRepresentation(_synth_token[i]);
                    IERC20(representation[i]).approve(_params.add, _synth_amount[i]);
                } else {
                    _synth_amount[i] = 0;
                }
            }

            //add liquidity stage
            uint256 min_mint_amount = IStableSwapPool(_params.add).calc_token_amount(_synth_amount, true);
            // inconsistency check
            if (_params.expected_min_mint_amount > min_mint_amount) {
                for (uint256 i = 0; i < representation.length; i++) {
                    if (_synth_amount[i] > 0) {
                        IERC20(representation[i]).safeTransfer(_params.to, _synth_amount[i]);
                        emit InconsistencyCallback(_params.add, representation[i], _params.to, _synth_amount[i]);
                    }
                }
                return;
            }

            // add liquidity
            IStableSwapPool(_params.add).add_liquidity(_synth_amount, 0);
        }
        // meta-exchange stage
        {
            address lpLocalPool = lp_token[_params.add];

            IERC20(lpLocalPool).approve(_params.exchange, 0);  // CurveV2 token support
            IERC20(lpLocalPool).approve(_params.exchange, IERC20(lpLocalPool).balanceOf(address(this)));

            uint256 dx = IERC20(lpLocalPool).balanceOf(address(this)); //amount to swap
            uint256 min_dy = IStableSwapPool(_params.exchange).get_dy(_params.i, _params.j, dx);

            // inconsistency check
            if (_params.expected_min_dy > min_dy) {
                IERC20(pool[_params.exchange].at(_params.i)).safeTransfer(
                    _params.to,
                    IERC20(pool[_params.exchange].at(_params.i)).balanceOf(address(this))
                );
                emit InconsistencyCallback(
                    _params.exchange,
                    pool[_params.exchange].at(_params.i),
                    _params.to,
                    IERC20(pool[_params.exchange].at(_params.i)).balanceOf(address(this))
                );
                return;
            }

            // perform exhange
            IStableSwapPool(_params.exchange).exchange(_params.i, _params.j, dx, min_dy);
        }
        // initiates unsynthesize request if mentioned
        if (_params.receiveSide != address(0)) {
            address representation = ISynthesis(synthesis).getRepresentation(
                bytes32(uint256(uint160(_params.unsynth_token)))
            );
            uint256 unsynth_amount = IERC20(representation).balanceOf(address(this));

            bytes memory out = abi.encodeWithSelector(
                bytes4(
                    keccak256(
                        "transit_unsynth_remove_liquidity_one_coin(address,uint256,address,int128,uint256,address,bytes32)"
                    )
                ),
                _params.unsynth_token,
                unsynth_amount,
                _params.remove,
                _params.x,
                _params.expected_min_amount,
                _params.to,
                ISynthesis(synthesis).getTxId()
            );

            ISynthesis(synthesis).burnSyntheticToken_transit(
                representation,
                unsynth_amount,
                ///////////////////////
                _params.chain2address,
                _params.receiveSide,
                _params.oppositeBridge,
                _params.chainID,
                out
            );

            return;
        } else {
            //remove liquidity one coin stage
            address lpToken = lp_token[_params.remove];
            IERC20(lpToken).approve(_params.remove, 0);  // CurveV2 token support
            IERC20(lpToken).approve(_params.remove, IERC20(lpToken).balanceOf(address(this)));

            uint256 token_amount = IERC20(lpToken).balanceOf(address(this));
            uint256 min_amount = IStableSwapPool(_params.remove).calc_withdraw_one_coin(token_amount, _params.x);

            // inconsistency check
            if (_params.expected_min_amount > min_amount) {
                IERC20(lpToken).safeTransfer(_params.to, token_amount);
                emit InconsistencyCallback(_params.remove, lpToken, _params.to, token_amount);
                return;
            }

            // remove liquidity
            IStableSwapPool(_params.remove).remove_liquidity_one_coin(token_amount, _params.x, min_amount);

            // transfer asset to the recipient
            IERC20(pool[_params.remove].at(_params.x)).safeTransfer(
                _params.to,
                IERC20(pool[_params.remove].at(_params.x)).balanceOf(address(this))
            );
        }
    }

    string public versionRecipient = "2.2.3";
}
