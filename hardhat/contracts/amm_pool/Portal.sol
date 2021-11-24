// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-newone/access/Ownable.sol";
import "@openzeppelin/contracts-newone/utils/math/SafeMath.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "./IBridge.sol";
import "./RelayRecipient.sol";

//TODO: relocate
interface IERC20 {
    function name() external returns (string memory);
    function symbol() external returns (string memory);
}

contract Portal is RelayRecipient {
    using SafeMath for uint256;

    mapping(address => uint256) public balanceOf;
    address public bridge;
    address public proxy;


    enum RequestState {
        Default,
        Sent,
        Reverted
    }
    enum UnsynthesizeState {
        Default,
        Unsynthesized,
        RevertRequest
    }

    struct TxState {
        bytes32 recipient;
        bytes32 chain2address;
        uint256 amount;
        bytes32 rtoken;
        RequestState state;
    }

    struct SynthParams {
        address chain2address;
        address receiveSide;
        address oppositeBridge;
        uint256 chainID;
    }

    uint256 requestCount = 1;
    mapping(bytes32 => TxState) public requests;
    mapping(bytes32 => UnsynthesizeState) public unsynthesizeStates;
    mapping(address => bytes) public tokenData;

    event SynthesizeRequest(
        bytes32 indexed _id,
        address indexed _from,
        address indexed _to,
        uint256 _amount,
        address _token
    );
    event SynthesizeRequestSolana(
        bytes32 indexed _id,
        address indexed _from,
        bytes32 indexed _to,
        uint256 _amount,
        address _token
    );
    event RevertBurnRequest(bytes32 indexed _id, address indexed _to);
    event BurnCompleted(bytes32 indexed _id, address indexed _to, uint256 _amount, address _token);
    event RevertSynthesizeCompleted(bytes32 indexed _id, address indexed _to, uint256 _amount, address _token);
    event RepresentationRequest(address indexed _rtoken);
    event ApprovedRepresentationRequest(address indexed _rtoken);


    constructor(address _bridge, address _trustedForwarder) RelayRecipient(_trustedForwarder) {
        bridge = _bridge;
    }

    modifier onlyBridge() {
        require(bridge == msg.sender);
        _;
    }


    /** 
    * @dev Synthesize token request.
    * @param _token token address to synthesize
    * @param _amount amount to synthesize 
    * @param _chain2address amount recipient address
    * @param _receiveSide request recipient address
    * @param _oppositeBridge opposite bridge address
    * @param _chainID opposite chain ID
    */
    function synthesize(
        address _token,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID
    ) external returns (bytes32 txID) {
        TransferHelper.safeTransferFrom(_token, _msgSender(), address(this), _amount);
        balanceOf[_token] = balanceOf[_token].add(_amount);

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            bytes32(uint256(uint160(_oppositeBridge))),
            _chainID,
            bytes32(uint256(uint160(_receiveSide))),
            bytes32(uint256(uint160(_msgSender()))),
            nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("mintSyntheticToken(bytes32,address,uint256,address)"))),
            txID,
            _token,
            _amount,
            _chain2address
        );
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);
        TxState storage txState = requests[txID];
        txState.recipient = bytes32(uint256(uint160(_msgSender())));
        txState.chain2address = bytes32(uint256(uint160(_chain2address)));
        txState.rtoken = bytes32(uint256(uint160(_token)));
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequest(txID, _msgSender(), _chain2address, _amount, _token);
    }


    /** 
    * @dev Synthesize token request with bytes32 support.
    * @param _token token address to synthesize
    * @param _amount amount to synthesize 
    * @param _chain2address recipient address
    * @param _receiveSide request recipient address
    * @param _oppositeBridge opposite bridge address
    * @param _chainID opposite chain ID
    */
    function synthesize_32(
        address _token,
        uint256 _amount,
        bytes32 _chain2address,
        bytes32 _receiveSide,
        bytes32 _oppositeBridge,
        uint256 _chainID
    ) external returns (bytes32 txID) {
        TransferHelper.safeTransferFrom(_token, _msgSender(), address(this), _amount);
        balanceOf[_token] = balanceOf[_token].add(_amount);

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            _oppositeBridge,
            _chainID,
            _receiveSide,
            bytes32(uint256(uint160(_msgSender()))),
            nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("mintSyntheticToken(bytes32,bytes32,uint256,bytes32)"))),
            txID,
            _token,
            _amount,
            _chain2address
        );
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2_32(out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);
        TxState storage txState = requests[txID];
        txState.recipient = bytes32(uint256(uint160(_msgSender())));
        txState.chain2address = _chain2address;
        txState.rtoken = bytes32(uint256(uint160(_token)));
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequestSolana(txID, _msgSender(), _chain2address, _amount, _token);
    }


    /** 
    * @dev Synthesize token request with permit.
    * @param _approvalData permit data
    * @param _token token address to synthesize
    * @param _amount amount to synthesize 
    * @param _chain2address amount recipient address
    * @param _receiveSide request recipient address
    * @param _oppositeBridge opposite bridge address
    * @param _chainID opposite chain ID
    */
    function synthesizeWithPermit(
        bytes calldata _approvalData,
        address _token,
        uint256 _amount,
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID
    ) external returns (bytes32 txID) {
        (bool _success1, ) = _token.call(_approvalData);
        require(_success1, "Approve call failed");

        TransferHelper.safeTransferFrom(_token, _msgSender(), address(this), _amount);
        balanceOf[_token] = balanceOf[_token].add(_amount);

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            bytes32(uint256(uint160(_oppositeBridge))),
            _chainID,
            bytes32(uint256(uint160(_receiveSide))),
            bytes32(uint256(uint160(_msgSender()))),
            nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("mintSyntheticToken(bytes32,address,uint256,address)"))),
            txID,
            _token,
            _amount,
            _chain2address
        );
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);
        TxState storage txState = requests[txID];
        txState.recipient = bytes32(uint256(uint160(_msgSender())));
        txState.chain2address = bytes32(uint256(uint160(_chain2address)));
        txState.rtoken = bytes32(uint256(uint160(_token)));
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequest(txID, _msgSender(), _chain2address, _amount, _token);
    }

    /** 
    * @dev Synthesize token request with permit and bytes32 support.
    * @param _approvalData permit data
    * @param _token token address to synthesize
    * @param _amount amount to synthesize 
    * @param _chain2address recipient address
    * @param _receiveSide request recipient address
    * @param _oppositeBridge opposite bridge address
    * @param _chainID opposite chain ID
    */
    function synthesizeWithPermit_32(
        bytes calldata _approvalData,
        address _token,
        uint256 _amount,
        bytes32 _chain2address,
        bytes32 _receiveSide,
        bytes32 _oppositeBridge,
        uint256 _chainID
    ) external returns (bytes32 txID) {
        (bool _success1, ) = _token.call(_approvalData);
        require(_success1, "Approve call failed");

        TransferHelper.safeTransferFrom(_token, _msgSender(), address(this), _amount);
        balanceOf[_token] = balanceOf[_token].add(_amount);

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        txID = IBridge(bridge).prepareRqId(
            _oppositeBridge,
            _chainID,
            _receiveSide,
            bytes32(uint256(uint160(_msgSender()))),
            nonce
        );

        bytes memory out = abi.encodeWithSelector(
            bytes4(keccak256(bytes("mintSyntheticToken(bytes32,bytes32,uint256,bytes32)"))),
            txID,
            bytes32(uint256(uint160(_token))),
            _amount,
            _chain2address
        );
        // TODO add payment by token
        IBridge(bridge).transmitRequestV2_32(out, _receiveSide, _oppositeBridge, _chainID, txID, _msgSender(), nonce);
        TxState storage txState = requests[txID];
        txState.recipient = bytes32(uint256(uint160(_msgSender())));
        txState.chain2address = _chain2address;
        txState.rtoken = bytes32(uint256(uint160(_token)));
        txState.amount = _amount;
        txState.state = RequestState.Sent;

        emit SynthesizeRequestSolana(txID, _msgSender(), _chain2address, _amount, _token);
    }

    /** 
    * @dev Emergency unsynthesize request. Can be called only by bridge after initiation on a second chain
    * @param _txID transaction ID to unsynth 
    */
    function emergencyUnsynthesize(bytes32 _txID) external onlyBridge {
        TxState storage txState = requests[_txID];
        require(txState.state == RequestState.Sent, "Portal:state not open or tx does not exist");

        txState.state = RequestState.Reverted; // close
        TransferHelper.safeTransfer(
            address(uint160(uint256(txState.rtoken))),
            address(uint160(uint256(txState.recipient))),
            txState.amount
        );

        emit RevertSynthesizeCompleted(
            _txID,
            address(uint160(uint256(txState.recipient))),
            txState.amount,
            address(uint160(uint256(txState.rtoken)))
        );
    }

    /** 
    * @dev Unsynthesize request. Can be called only by bridge after initiation on a second chain
    * @param _txID transaction ID to unsynth 
    * @param _token token address to unsynth 
    * @param _amount amount to unsynth 
    * @param _to recipient address
    */
    function unsynthesize(
        bytes32 _txID,
        address _token,
        uint256 _amount,
        address _to
    ) external onlyBridge {
        require(unsynthesizeStates[_txID] == UnsynthesizeState.Default, "Portal: syntatic tokens emergencyUnburn");

        TransferHelper.safeTransfer(_token, _to, _amount);
        balanceOf[_token] = balanceOf[_token].sub(_amount);

        unsynthesizeStates[_txID] = UnsynthesizeState.Unsynthesized;

        emit BurnCompleted(_txID, _to, _amount, _token);
    }

    /** 
    * @dev Revert burnSyntheticToken() operation, can be called several times.
    * @param _txID transaction ID to unburn
    * @param _receiveSide receiver contract address
    * @param _oppositeBridge opposite bridge address
    * @param _chainId opposite chain ID
    */
    function emergencyUnburnRequest(
        bytes32 _txID,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainId
    ) external {
        require(unsynthesizeStates[_txID] != UnsynthesizeState.Unsynthesized, "Portal: Real tokens already transfered");
        unsynthesizeStates[_txID] = UnsynthesizeState.RevertRequest;

        bytes memory out = abi.encodeWithSelector(bytes4(keccak256(bytes("emergencyUnburn(bytes32)"))), _txID);
        // TODO add payment by token
        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 txID = IBridge(bridge).prepareRqId(
            bytes32(uint256(uint160(_oppositeBridge))),
            _chainId,
            bytes32(uint256(uint160(_receiveSide))),
            bytes32(uint256(uint160(_msgSender()))),
            nonce
        );
        IBridge(bridge).transmitRequestV2(out, _receiveSide, _oppositeBridge, _chainId, txID, _msgSender(), nonce);

        emit RevertBurnRequest(txID, _msgSender());
    }

    /** 
    * @dev Revert burnSyntheticToken() operation with bytes32 support. Can be called several times.
    * @param _txID transaction ID to unburn
    * @param _receiveSide receiver contract address
    * @param _oppositeBridge opposite bridge address
    * @param _chainId opposite chain ID
    */
    function emergencyUnburnRequest_32(
        bytes32 _txID,
        bytes32 _receiveSide,
        bytes32 _oppositeBridge,
        uint256 _chainId
    ) external {
        require(unsynthesizeStates[_txID] != UnsynthesizeState.Unsynthesized, "Portal: Real tokens already transfered");
        unsynthesizeStates[_txID] = UnsynthesizeState.RevertRequest;

        bytes memory out = abi.encodeWithSelector(bytes4(keccak256(bytes("emergencyUnburn(bytes32)"))), _txID);
        // TODO add payment by token
        uint256 nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 txID = IBridge(bridge).prepareRqId(
            _oppositeBridge,
            _chainId,
            _receiveSide,
            bytes32(uint256(uint160(_msgSender()))),
            nonce
        );
        IBridge(bridge).transmitRequestV2_32(out, _receiveSide, _oppositeBridge, _chainId, txID, _msgSender(), nonce);

        emit RevertBurnRequest(txID, _msgSender());
    }

    // should be restricted in mainnets (test only)
    function changeBridge(address _bridge) external onlyOwner {
        bridge = _bridge;
    }

    function versionRecipient() public view returns (string memory) {
        return "2.0.1";
    }

    function createRepresentationRequest(address _rtoken) external {
        emit RepresentationRequest(_rtoken);
    }

    // implies manual verification point
    function approveRepresentationRequest(address _rtoken) external /**onlyOwner */ {
        tokenData[_rtoken] = abi.encode(IERC20(_rtoken).name(), IERC20(_rtoken).symbol());
        emit ApprovedRepresentationRequest(_rtoken);
    }


//TODO
    function getTxId() external returns (bytes32) {

        return keccak256(abi.encodePacked(this, block.timestamp));
    }

    function setProxyCurve(address _proxy) external onlyOwner {
        proxy = _proxy;
    }

    function synthesize_transit(
        address _token,
        uint256 _amount,
        //////////////////////
        address _chain2address,
        address _receiveSide,
        address _oppositeBridge,
        uint256 _chainID,
        bytes memory _out
    ) external returns (bytes32 txId) {
        // require(
        //     tokenData[_token].length != 0,
        //     "Portal: token must be verified"
        // );
        TransferHelper.safeTransferFrom(
            _token,
            _msgSender(),
            address(this),
            _amount
        );
        balanceOf[_token] = balanceOf[_token].add(_amount);

        uint256 nonce = IBridge(bridge).getNonce(_msgSender());

        txId = IBridge(bridge).prepareRqId(
            bytes32(uint256(uint160(_oppositeBridge))),
            _chainID,
            bytes32(uint256(uint160(_receiveSide))),
            bytes32(uint256(uint160(_msgSender()))),
            nonce
        );


        // TODO add payment by token
        IBridge(bridge).transmitRequestV2(_out,_receiveSide, _oppositeBridge, _chainID, txId, _msgSender(), nonce);
        TxState storage txState = requests[txId];
        txState.recipient = bytes32(uint256(uint160(_msgSender()))); //change!
        txState.chain2address = bytes32(uint256(uint160(_chain2address)));
        txState.rtoken = bytes32(uint256(uint160(_token)));
        txState.amount = _amount;
        txState.state = RequestState.Sent;


        emit SynthesizeRequest(
            txId,
            _msgSender(),
            _chain2address,
            _amount,
            _token
        );
    }

    // portal => proxy
    function synthesize_batch_transit(
        address[] memory _tokens,
        uint256[] memory _amounts, // set the amount in order to initiate a synthesize request
        SynthParams memory _synth_params,
        bytes4 _selector,
        bytes memory _transit_data
    ) external  {

        bytes32[] memory txId = new bytes32[](_tokens.length);

        //synthesize request
        for (uint256 i = 0; i < _tokens.length; i++) {
            if(_amounts[i] > 0){
                TransferHelper.safeTransferFrom(
                    _tokens[i],
                    _msgSender(),
                    address(this),
                    _amounts[i]
                );

                balanceOf[_tokens[i]] = balanceOf[_tokens[i]].add(_amounts[i]);
                uint256 nonce = IBridge(bridge).getNonce(_msgSender());

                txId[i] =  keccak256(abi.encodePacked(IBridge(bridge).prepareRqId(
                    bytes32(uint256(uint160(_synth_params.oppositeBridge))),
                    _synth_params.chainID,
                    bytes32(uint256(uint160(_synth_params.receiveSide))),
                    bytes32(uint256(uint160(_msgSender()))),
                    nonce
                 ),i))  ;

                // TODO add payment by token
                TxState storage txState = requests[txId[i]];
                txState.recipient = bytes32(uint256(uint160(_msgSender()))); //change!
                txState.chain2address = bytes32(uint256(uint160(_synth_params.chain2address)));
                txState.rtoken = bytes32(uint256(uint160(_tokens[i])));
                txState.amount = _amounts[i];
                txState.state = RequestState.Sent;



                emit SynthesizeRequest(
                    txId[i],
                    _msgSender(),
                    _synth_params.chain2address,
                    _amounts[i],
                    _tokens[i]
                );
            }
        }

        // encode call
        bytes memory out = abi.encodePacked(
            _selector,
            _transit_data,
            //////////////
            _tokens,
            _amounts,
            txId
        );

        uint256 general_nonce = IBridge(bridge).getNonce(_msgSender());
        bytes32 general_txId = IBridge(bridge).prepareRqId(
                    bytes32(uint256(uint160(_synth_params.oppositeBridge))),
                    _synth_params.chainID,
                    bytes32(uint256(uint160(_synth_params.receiveSide))),
                    bytes32(uint256(uint160(_msgSender()))),
                    general_nonce
                 );
                 
        IBridge(bridge).transmitRequestV2(
            out,
            _synth_params.receiveSide,
            _synth_params.oppositeBridge,
            _synth_params.chainID,
            general_txId,
            _msgSender(),
            general_nonce
        );
    }
}
