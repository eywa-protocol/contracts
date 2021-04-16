pragma solidity >=0.4.21 < 0.7.0;

import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./libraries/Other.sol";





contract Bridge is ChainlinkClient, Ownable {
  
  //TODO к коефиге ноды чейнлинка стоит 1 линк. Попытаться исправить
  uint256 constant private ORACLE_PAYMENT =  1 * LINK;//0.1 * 10 ** 18; // 0.1 LINK    
  address public oracle;

  bytes32[] private specIdListPermission;
  uint256 constant public EXPIRY_TIME   = 5 minutes;
  uint256 constant private ARGS_VERSION = 1;

  event OracleRequest(
    bytes32 indexed specId,
    address requester,
    bytes32 requestId,
    uint256 payment,
    address callbackAddr,
    bytes4 callbackFunctionId,
    uint256 cancelExpiration,
    uint256 dataVersion,
    bytes data
  );
  

  // requestId => recipient
  mapping(bytes32 => address) private routeForCallback;
  mapping(address => bool)    private whiteList;
  mapping(bytes32 => uint256) private agregator;
  
  /**
   * @notice Deploy the contract with a specified address for the LINK
   * and Oracle contract addresses
   * @dev Sets the storage for the specified addresses
   * @param _link The address of the LINK token contract
   */
  constructor(address _link, address _oracle) public {

    oracle      = _oracle;

    if (_link == address(0)) {
      setPublicChainlinkToken();
    } else {
      setChainlinkToken(_link);
    }
  }

  function setPermissionJobId(bytes32 jobId)
    external
    onlyOwner
  {
    specIdListPermission.push(jobId);
  }

  function setControl(address a) external onlyOwner {
    whiteList[a] = true;
  }

  function getPermissionJobId() external view returns(bytes32[] memory){
    return specIdListPermission;
  }
  function setOracle(address val) external onlyOwner {
    oracle = val;
  }



  /**
   * @notice Returns the address of the LINK token
   * @dev This is the public implementation for chainlinkTokenAddress, which is
   * an internal method of the ChainlinkClient contract
   */
  function getChainlinkToken() public view returns (address) {
    return chainlinkTokenAddress();
  }


  function transmitRequestV2(bytes memory  _selector, address receiveSide)
    public
    /*onlyOwner*/
    returns (bytes32 requestId)
  {

    //require(msg.sender == myContract, "ONLY PERMISSIONED ADDRESS");

    Chainlink.Request memory req = buildChainlinkRequest(specIdListPermission[0], address(this), this.callback.selector);
    req.add("selector", Other.bytesToHexString(_selector));
    req.add("callback", "disable");
    req.add("request_type", "setRequest");
    req.add("receive_side", Other.toAsciiString(receiveSide));
    
    requestId = sendChainlinkRequestTo(oracle, req, ORACLE_PAYMENT);
    
    emitBroadcast(address(this),
                  requestId,
                  ORACLE_PAYMENT,
                  address(this),
                  this.callback.selector,
                  EXPIRY_TIME,
                  ARGS_VERSION,
                  req.buf.buf);
  }

  /**
    Create request from 1 -> 2 (another side)
  */
  function transmitRequest(string memory rqt, bytes memory  _selector, address receiveSide)
    public
    /*onlyOwner*/
    returns (bytes32 requestId)
  {

    //require(msg.sender == myContract, "ONLY PERMISSIONED ADDRESS");

    Chainlink.Request memory req = buildChainlinkRequest(specIdListPermission[0], address(this), this.callback.selector);
    req.add("selector", Other.bytesToHexString(_selector));
    req.add("request_type", rqt);
    req.add("receive_side", Other.toAsciiString(receiveSide));
    
    requestId = sendChainlinkRequestTo(oracle, req, ORACLE_PAYMENT);
    routeForCallback[requestId] = msg.sender;

    emitBroadcast(address(this),
                  requestId,
                  ORACLE_PAYMENT,
                  address(this),
                  this.callback.selector,
                  EXPIRY_TIME,
                  ARGS_VERSION,
                  req.buf.buf);
  }

  /**
    Create response on request from 2 -> 1 (initiator side)
  */
  function transmitResponse(string memory correlationId) private returns (bytes32 requestId){

    Chainlink.Request memory req = buildChainlinkRequest(specIdListPermission[0], address(this), this.callback.selector);
    req.add("request_type", "setResponse");
    req.add("correlationId", correlationId);
    

    requestId = sendChainlinkRequestTo(oracle, req, ORACLE_PAYMENT);

    emitBroadcast(address(this),
                  requestId,
                  ORACLE_PAYMENT,
                  address(this),
                  this.callback.selector,
                  EXPIRY_TIME,
                  ARGS_VERSION,
                  req.buf.buf);
  
  }
  /**
  * Receive invoke from other network through external adapter
  * Change state smart-contrat
  *
  */
  // WARN whitelist must be includes ID of first side && msg.sender it's address adapter => adr control -> adr adapter -> id otherside
  // TODO to do msg.sender  under sign
  function receiveRequest(string memory reqId,
                          bytes memory signature,
                          bytes memory b,
                          bytes32 tx,
                          address receiveSide) external {

    bytes32 hreqId   = keccak256(abi.encodePacked(reqId));
    bytes32 hash     = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(reqId, b, tx, receiveSide)));
    address res      = ECDSA.recover(hash, signature);
    require(true == whiteList[res], 'SECURITY EVENT');
    // require receiveSide != 0 || ....
    
    agregator[hreqId] = agregator[hreqId] + 1;
    // HARD code: temporary equals 2
    if(agregator[hreqId] == 2 /* && NONCE === hash(local nonce, adr mycont_1) && ALL hashs == */){
      (bool success, bytes memory data) = receiveSide.call(b);
      require(success && (data.length == 0 || abi.decode(data, (bool))), 'FAILED');
      
      transmitResponse(reqId);
    }
  }
  function receiveRequestV2(string memory reqId,
                          bytes memory signature,
                          bytes memory b,
                          bytes32 tx,
                          address receiveSide) external {

    bytes32 hreqId   = keccak256(abi.encodePacked(reqId));
    bytes32 hash     = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(reqId, b, tx, receiveSide)));
    address res      = ECDSA.recover(hash, signature);
    require(true == whiteList[res], 'SECURITY EVENT');
    // require receiveSide != 0 || ....
    
    agregator[hreqId] = agregator[hreqId] + 1;
    // HARD code: temporary equals 2
    if(agregator[hreqId] == 2 /* && NONCE === hash(local nonce, adr mycont_1) && ALL hashs == */){
      (bool success, bytes memory data) = receiveSide.call(b);
      require(success && (data.length == 0 || abi.decode(data, (bool))), 'FAILED');
    }
  }
  /** Receive response from other side.
    precondition:
      bridgepart_1#transmitRequest -> bridgepart_2#receiveRequest -> bridgepart_2#transmitResponse -> bridgepart_1#receiveResponse
  */
  function receiveResponse(bytes32 correlationId, bytes memory signature, bytes32 tx, bytes32 reqId) external /*onlyOwner*/ {

    bytes32 hash     = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(correlationId, tx, reqId)));
    address res      = ECDSA.recover(hash, signature);
    require(true == whiteList[res], 'SECURITY EVENT');
    require(address(0) != routeForCallback[correlationId], 'SECURITY EVENT: BAD CORRELATIONID');

    agregator[reqId] = agregator[reqId] + 1;
    // HARD code: temporary equals 2
    if(agregator[reqId] == 2 /* && NONCE === hash(local nonce, adr mycont_1) && ALL hashs == */){
      bytes memory b = abi.encodeWithSelector(bytes4(keccak256(bytes('setPendingRequestsDone(bytes32,bytes32)'))), correlationId, tx);
      (bool success, bytes memory data) = routeForCallback[correlationId].call(b);
      require(success && (data.length == 0 || abi.decode(data, (bool))), 'FAILED');
    }


    
  }

  /**
   * @notice The callback method from requests created by transmit
   * @dev The recordChainlinkFulfillment protects this function from being called
   * by anyone other than the oracle address that the request was sent to
   * @param _requestId The ID that was generated for the request
   * @param _data The answer provided by the oracle. In this case tx.
   */
  function callback(bytes32 _requestId, bytes32 _data)
    public
    recordChainlinkFulfillment(_requestId)
  {
    
    //DexPool(routeForCallback[_requestId]).setPendingRequestsDone(_requestId, _data);
  }

  /**
   * @notice Allows the owner to withdraw any LINK balance on the contract
   */
  function withdrawLink() public onlyOwner {
    LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
    require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
  }

  /**
   * @notice Call this method if no response is received within 5 minutes
   * @param _requestId The ID that was generated for the request to cancel
   * @param _payment The payment specified for the request to cancel
   * @param _callbackFunctionId The bytes4 callback function ID specified for
   * the request to cancel
   * @param _expiration The expiration generated for the request to cancel
   */
  function cancelRequest(
    bytes32 _requestId,
    uint256 _payment,
    bytes4 _callbackFunctionId,
    uint256 _expiration
  )
    public
    onlyOwner
  {
    cancelChainlinkRequest(_requestId, _payment, _callbackFunctionId, _expiration);
  }

  function emitBroadcast(
    address _sender,
    bytes32 requestId,
    uint256 _payment,
    address _callbackAddress,
    bytes4 _callbackFunctionId,
    uint256 expiration,
    uint256 _dataVersion,
    bytes memory _data
  ) private {

      uint256 len = specIdListPermission.length;
      for(uint256 y = 1; y < len; y++){
        emit OracleRequest(
          specIdListPermission[y],
          _sender,
          requestId,
          _payment,
          _callbackAddress,
          _callbackFunctionId,
          expiration,
          _dataVersion,
          _data);
      }
  }
}
