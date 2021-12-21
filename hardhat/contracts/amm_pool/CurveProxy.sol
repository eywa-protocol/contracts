//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.6;
pragma abicoder v2;
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../utils/@opengsn/contracts/src/BaseRelayRecipient.sol";
import "./IStableSwapPool.sol";
import "../utils/Typecast.sol";

import "hardhat/console.sol";

interface IPortal {
    struct SynthParams {
        address recipientAddress;
        address callDestination;
        address oppositeBridge;
        uint256 chainID;
    }

    function unsynthesize(
        bytes32 txId,
        address token,
        uint256 amount,
        address to
    ) external;

    function synthesize_transit(
        address token,
        uint256 amount,
        address recipientAddress,
        address callDestination,
        address oppositeBridge,
        uint256 chainID,
        bytes memory out
    ) external returns (bytes32 txId);

    function synthesize_batch_transit(
        address[] memory token,
        uint256[] memory amounts,
        SynthParams memory synth_params,
        bytes4 selector,
        bytes memory transit_data
    ) external;

    function getTxId() external returns (bytes32);

    function getTokenData(address rtoken) external returns (bytes memory);
}

interface ISynthesis {
    function mintSyntheticToken(
        bytes32 txId,
        address tokenReal,
        uint256 amount,
        address to
    ) external;

    function burnSyntheticToken_transit(
        address stoken,
        uint256 amount,
        address recipientAddress,
        address callDestination,
        address oppositeBridge,
        uint256 chainID,
        bytes memory out
    ) external returns (bytes32 txId);

    function getRepresentation(bytes32 rtoken) external view returns (address);

    function getTxId() external returns (bytes32);
}

contract CurveProxy is BaseRelayRecipient, Typecast {
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
        trustedForwarder = _forwarder;
        portal = _portal;
        synthesis = _synthesis;
        bridge = _bridge;
    }

    struct SynthParams {
        address recipientAddress;
        address callDestination;
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
        int128 i; //index value for the coin to send
        int128 j; //index value of the coin to receive
        uint256 expected_min_dy;
        //withdraw one coin params
        int128 x; // index value of the coin to withdraw
        uint256 expected_min_amount;
        //transfer to
        address to;
        //unsynth params
        address unsynth_token;
        address recipientAddress;
        address callDestination;
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
        int128 i; //index value for the coin to send
        int128 j; //index value of the coin to receive
        uint256 expected_min_dy;
        //withdraw one coin params
        int128 x; // index value of the coin to withdraw
        uint256 expected_min_amount;
        //transfer to
        address to;
        //unsynth params
        address unsynth_token;
        address recipientAddress;
        address callDestination;
        address oppositeBridge;
        uint256 chainID;
    }

    event InconsistencyCallback(address pool, address token, address to, uint256 amount);

    modifier onlyBridge() {
        require(bridge == _msgSender());
        _;
    }

    ///@dev Set the corresponding pool data to use proxy with
    ///@param stable_pool stable pool address
    ///@param lp lp token address for the corresponding pool
    ///@param coins listed token addresses
    /////////////////////////////////////////////////////////////
    function setPool(
        address stable_pool,
        address lp,
        address[] memory coins
    ) public {
        for (uint256 i = 0; i < coins.length; i++) {
            pool[stable_pool].add(coins[i]);
        }
        lp_token[stable_pool] = lp;
    }

    ///@dev Meta exhcange stage(A).
    ///@param add pool address
    ///@param amounts list of amounts of coins to deposit
    ///@param min_mint_amount minimum amount of LP tokens to mint from the deposit
    ///@param synth_params synth params
    ///@param selector proxy function selector
    ///@param transit_data encoded data for transition
    /////////////////////////////////////////////////////////////
    function add_liquidity_3pool_transit_synthesize(
        address add,
        uint256[3] memory amounts,
        uint256 min_mint_amount,
        SynthParams memory synth_params,
        bytes4 selector,
        bytes memory transit_data
    ) external {
        //add_liquidity_3pool
        for (uint256 i = 0; i < amounts.length; i++) {
            if (amounts[i] > 0) {
                IERC20(pool[add].at(i)).safeTransferFrom(_msgSender(), address(this), amounts[i]);
                IERC20(pool[add].at(i)).approve(address(add), amounts[i]);
            }
        }
        IStableSwapPool(add).add_liquidity(amounts, min_mint_amount);

        //approve LP for Portal
        address lp = lp_token[add];
        uint256 this_balance = IERC20(lp).balanceOf(address(this));
        IERC20(lp).approve(portal, 0);  // CurveV2 token support
        IERC20(lp).approve(portal, this_balance);

        //pack synthesize request with transit
        bytes memory out = abi.encodePacked(
            selector,
            transit_data,
            abi.encode(lp, this_balance, IPortal(portal).getTxId())
        );

        // transit meta request
        IPortal(portal).synthesize_transit(
            lp,
            this_balance, //amount to synthesize
            ////////////////////////////
            synth_params.recipientAddress,
            synth_params.callDestination,
            synth_params.oppositeBridge,
            synth_params.chainID,
            out
        );
    }

    function add_liquidity_3pool_transit_synthesize_batch(
        address add,
        uint256[3] memory amounts,
        uint256 min_mint_amount,
        SynthParams memory synth_params,
        uint8[2] memory opposite_pool_numbers, // [0]pool_size, [1]coin_index
        bytes4 selector,
        bytes memory transit_data
    ) external {
        //add_liquidity_3pool
        for (uint256 i = 0; i < amounts.length; i++) {
            if (amounts[i] > 0) {
                IERC20(pool[add].at(i)).safeTransferFrom(_msgSender(), address(this), amounts[i]);
                IERC20(pool[add].at(i)).approve(address(add), amounts[i]);
            }
        }
        IStableSwapPool(add).add_liquidity(amounts, min_mint_amount);

        // {
        address[] memory synth_token = new address[](opposite_pool_numbers[0]);
        uint256[] memory synth_amount = new uint256[](opposite_pool_numbers[0]);

        //approve LP for Portal
        synth_token[opposite_pool_numbers[1]] = lp_token[add];
        synth_amount[opposite_pool_numbers[1]] = IERC20(synth_token[opposite_pool_numbers[1]]).balanceOf(
            address(this)
        );
        IERC20(synth_token[opposite_pool_numbers[1]]).approve(portal, 0);  // CurveV2 token support
        IERC20(synth_token[opposite_pool_numbers[1]]).approve(portal, synth_amount[opposite_pool_numbers[1]]);

        // synthesize batch transit => transit_synth_add_liquidity_[opposite_pool_numbers[0]]pool
        IPortal(portal).synthesize_batch_transit(
            synth_token,
            synth_amount, //amount to synthesize
            ////////////////////////////
            IPortal.SynthParams(
                synth_params.recipientAddress,
                synth_params.callDestination,
                synth_params.oppositeBridge,
                synth_params.chainID
            ),
            selector,
            transit_data
        );
        // }
    }

    ///@dev Meta exhcange stage(B).
    ///@param params meta exchange params
    ///@param synth_token token address to synth
    ///@param synth_amount amount to synth
    ///@param txId transaction ID
    /////////////////////////////////////////////////////////////
    function transit_meta_exchange(
        MetaExchangeParams memory params,
        address synth_token,
        uint256 synth_amount,
        bytes32 txId
    ) external onlyBridge {
        {
            // synthesize stage
            ISynthesis(synthesis).mintSyntheticToken(txId, synth_token, synth_amount, address(this));

            //exchange stage
            address representation = ISynthesis(synthesis).getRepresentation(castToBytes32(synth_token));
            IERC20(representation).approve(params.exchange, 0);
            IERC20(representation).approve(params.exchange, IERC20(representation).balanceOf(address(this)));

            uint256 dx = IERC20(representation).balanceOf(address(this)); //amount to swap
            uint256 min_dy = IStableSwapPool(params.exchange).get_dy(params.i, params.j, dx);

            // inconsistency check
            if (params.expected_min_dy > min_dy) {
                uint256 this_balance = IERC20(pool[params.exchange].at(uint256(params.i))).balanceOf(address(this));
                IERC20(pool[params.exchange].at(uint256(params.i))).safeTransfer(
                    params.to,
                    this_balance
                );
                emit InconsistencyCallback(
                    params.exchange,
                    pool[params.exchange].at(uint256(params.i)),
                    params.to,
                    this_balance
                );
                return;
            }

            // perform exhange
            IStableSwapPool(params.exchange).exchange(params.i, params.j, dx, min_dy);
        }
        // initiates unsynthesize request if mentioned
        if (params.callDestination != address(0)) {
            address representation = ISynthesis(synthesis).getRepresentation(
                castToBytes32(params.unsynth_token)
            );
            uint256 unsynth_amount = IERC20(representation).balanceOf(address(this));
            bytes32 txId = ISynthesis(synthesis).getTxId();

            bytes memory out = abi.encodeWithSelector(
                bytes4(
                    keccak256(
                        "transit_unsynth_remove_liquidity_one_coin(address,uint256,address,int128,uint256,address,bytes32)"
                    )
                ),
                params.unsynth_token,
                unsynth_amount,
                params.remove,
                params.x,
                params.expected_min_amount,
                params.to,
                txId
            );

            ISynthesis(synthesis).burnSyntheticToken_transit(
                representation,
                unsynth_amount,
                ///////////////////////
                params.recipientAddress, // need to delete!!!!!
                params.callDestination,
                params.oppositeBridge,
                params.chainID,
                out
            );

            return;
        } else {
            //remove liquidity one coin stage
            address lpToken = lp_token[params.remove];
            IERC20(lpToken).approve(params.remove, 0);  // CurveV2 token support
            IERC20(lpToken).approve(params.remove, IERC20(lpToken).balanceOf(address(this)));

            uint256 token_amount = IERC20(lpToken).balanceOf(address(this));
            uint256 min_amount = IStableSwapPool(params.remove).calc_withdraw_one_coin(token_amount, params.x);

            // inconsistency check
            if (params.expected_min_amount > min_amount) {
                IERC20(lpToken).safeTransfer(params.to, token_amount);
                emit InconsistencyCallback(params.remove, lpToken, params.to, token_amount);
                return;
            }

            // remove liquidity
            IStableSwapPool(params.remove).remove_liquidity_one_coin(token_amount, params.x, min_amount);

            // transfer asset to the recipient
            IERC20(pool[params.remove].at(uint256(params.x))).safeTransfer(
                params.to,
                IERC20(pool[params.remove].at(uint256(params.x))).balanceOf(address(this))
            );
        }
    }

    ///@dev Meta exhcange stage(C).
    ///@param token token address to unsynth
    ///@param amount amount to unsynth
    ///@param remove pool address to perform withdraw on
    ///@param x token address for withdraw
    ///@param expected_min_amount expected amount to withdraw
    ///@param to recipient address
    ///@param txId transaction ID
    /////////////////////////////////////////////////////////////
    function transit_unsynth_remove_liquidity_one_coin(
        address token,
        uint256 amount,
        address remove,
        int128 x,
        uint256 expected_min_amount,
        address to,
        bytes32 txId
    ) external onlyBridge {
        //unsynthesize
        IPortal(portal).unsynthesize(txId, token, amount, address(this));

        //remove liquidity one coin
        IERC20(token).approve(remove, 0);  // CurveV2 token support
        IERC20(token).approve(remove, IERC20(token).balanceOf(address(this)));

        uint256 token_amount = IERC20(token).balanceOf(address(this));
        uint256 min_amount = IStableSwapPool(remove).calc_withdraw_one_coin(token_amount, x);

        if (expected_min_amount > min_amount) {
            IERC20(token).safeTransfer(to, token_amount);
            emit InconsistencyCallback(remove, token, to, token_amount);
            return;
        }

        IStableSwapPool(remove).remove_liquidity_one_coin(token_amount, x, min_amount);

        // transfer asset to the recipient
        IERC20(pool[remove].at(uint256(x))).safeTransfer(
            to,
            IERC20(pool[remove].at(uint256(x))).balanceOf(address(this))
        );
    }

    ///@dev transit synth batch and add liquidity to the 3pool.
    ///@param params add liquidity 3Pool params
    ///@param synth_token tokens to synth
    ///@param synth_amount amounts to synth
    ///@param txId transaction IDs
    /////////////////////////////////////////////////////////////
    function transit_synth_batch_add_liquidity_3pool(
        AddLiquidity3Pool memory params,
        address[3] memory synth_token,
        uint256[3] memory synth_amount,
        bytes32[3] memory txId
    ) external onlyBridge {
        address[3] memory representation;

        //synthesize stage
        for (uint256 i = 0; i < txId.length; i++) {
            representation[i] = ISynthesis(synthesis).getRepresentation(castToBytes32(synth_token[i]));
            if (synth_amount[i] > 0) {
                ISynthesis(synthesis).mintSyntheticToken(txId[i], synth_token[i], synth_amount[i], address(this));
                // representation[i] = ISynthesis(synthesis).getRepresentation(synth_token[i]);
                IERC20(representation[i]).approve(params.add, synth_amount[i]);
            } else {
                synth_amount[i] = 0;
            }
        }

        //add liquidity stage
        uint256 min_mint_amount = IStableSwapPool(params.add).calc_token_amount(synth_amount, true);

        // inconsistency check
        if (params.expected_min_mint_amount > min_mint_amount) {
            for (uint256 i = 0; i < representation.length; i++) {
                if (synth_amount[i] > 0) {
                    IERC20(representation[i]).safeTransfer(params.to, synth_amount[i]);
                    emit InconsistencyCallback(params.add, representation[i], params.to, synth_amount[i]);
                }
            }
            return;
        }

        // add liquidity
        IStableSwapPool(params.add).add_liquidity(synth_amount, 0);

        //transfer asset to the recipient
        IERC20(lp_token[params.add]).safeTransfer(params.to, IERC20(lp_token[params.add]).balanceOf(address(this)));
    }

    function transit_synth_batch_meta_exchange_eth(
        MetaExchangeParamsETH memory params,
        address[3] memory synth_token,
        uint256[3] memory synth_amount,
        bytes32[3] memory txId
    ) external onlyBridge {
        {
            address[3] memory representation;

            //synthesize stage
            for (uint256 i = 0; i < txId.length; i++) {
                representation[i] = ISynthesis(synthesis).getRepresentation(castToBytes32(synth_token[i]));
                if (synth_amount[i] > 0) {
                    ISynthesis(synthesis).mintSyntheticToken(
                        txId[i],
                        synth_token[i],
                        synth_amount[i],
                        address(this)
                    );
                    // representation[i] = ISynthesis(synthesis).getRepresentation(synth_token[i]);
                    IERC20(representation[i]).approve(params.add, synth_amount[i]);
                } else {
                    synth_amount[i] = 0;
                }
            }

            //add liquidity stage
            uint256 min_mint_amount = IStableSwapPool(params.add).calc_token_amount(synth_amount, true);
            // inconsistency check
            if (params.expected_min_mint_amount > min_mint_amount) {
                for (uint256 i = 0; i < representation.length; i++) {
                    if (synth_amount[i] > 0) {
                        IERC20(representation[i]).safeTransfer(params.to, synth_amount[i]);
                        emit InconsistencyCallback(params.add, representation[i], params.to, synth_amount[i]);
                    }
                }
                return;
            }

            // add liquidity
            IStableSwapPool(params.add).add_liquidity(synth_amount, 0);
        }
        // meta-exchange stage
        {
            address lpLocalPool = lp_token[params.add];

            IERC20(lpLocalPool).approve(params.exchange, 0);  // CurveV2 token support
            IERC20(lpLocalPool).approve(params.exchange, IERC20(lpLocalPool).balanceOf(address(this)));

            uint256 dx = IERC20(lpLocalPool).balanceOf(address(this)); //amount to swap
            uint256 min_dy = IStableSwapPool(params.exchange).get_dy(params.i, params.j, dx);

            // inconsistency check
            if (params.expected_min_dy > min_dy) {
                uint256 this_balance = IERC20(pool[params.exchange].at(uint256(params.i))).balanceOf(address(this));
                IERC20(pool[params.exchange].at(uint256(params.i))).safeTransfer(
                    params.to,
                    this_balance
                );
                emit InconsistencyCallback(
                    params.exchange,
                    pool[params.exchange].at(uint256(params.i)),
                    params.to,
                    this_balance
                );
                return;
            }

            // perform exhange
            IStableSwapPool(params.exchange).exchange(params.i, params.j, dx, min_dy);
        }
        // initiates unsynthesize request if mentioned
        if (params.callDestination != address(0)) {
            address representation = ISynthesis(synthesis).getRepresentation(
                castToBytes32(params.unsynth_token)
            );
            uint256 unsynth_amount = IERC20(representation).balanceOf(address(this));

            bytes memory out = abi.encodeWithSelector(
                bytes4(
                    keccak256(
                        "transit_unsynth_remove_liquidity_one_coin(address,uint256,address,int128,uint256,address,bytes32)"
                    )
                ),
                params.unsynth_token,
                unsynth_amount,
                params.remove,
                params.x,
                params.expected_min_amount,
                params.to,
                ISynthesis(synthesis).getTxId()
            );

            ISynthesis(synthesis).burnSyntheticToken_transit(
                representation,
                unsynth_amount,
                ///////////////////////
                params.recipientAddress,
                params.callDestination,
                params.oppositeBridge,
                params.chainID,
                out
            );

            return;
        } else {
            //remove liquidity one coin stage
            address lpToken = lp_token[params.remove];
            IERC20(lpToken).approve(params.remove, 0);  // CurveV2 token support
            IERC20(lpToken).approve(params.remove, IERC20(lpToken).balanceOf(address(this)));

            uint256 token_amount = IERC20(lpToken).balanceOf(address(this));
            uint256 min_amount = IStableSwapPool(params.remove).calc_withdraw_one_coin(token_amount, params.x);

            // inconsistency check
            if (params.expected_min_amount > min_amount) {
                IERC20(lpToken).safeTransfer(params.to, token_amount);
                emit InconsistencyCallback(params.remove, lpToken, params.to, token_amount);
                return;
            }

            // remove liquidity
            IStableSwapPool(params.remove).remove_liquidity_one_coin(token_amount, params.x, min_amount);

            // transfer asset to the recipient
            IERC20(pool[params.remove].at(uint256(params.x))).safeTransfer(
                params.to,
                IERC20(pool[params.remove].at(uint256(params.x))).balanceOf(address(this))
            );
        }
    }

    string public override versionRecipient = "2.2.0";
}
