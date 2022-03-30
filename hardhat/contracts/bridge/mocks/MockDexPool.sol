// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../Bridge.sol";
import "../../amm_pool/SolanaSerialize.sol";

/**
 * @notice This is for test purpose.
 *
 * @dev Short life cycle
 * @dev POOL_1#sendRequestTest --> {logic bridge} --> POOL_2#setPendingRequestsDone
 */
contract MockDexPool is SolanaSerialize {
    bytes8 private SET_VALUE_SIGHASH = sigHash("global:set_value");
    string constant private SET_REQUEST_TYPE = "setRequest";
    uint256 public testData = 0;
    address public bridge;
    mapping(bytes32 => uint256) public requests;
    bytes32[] public doubleRequestIds;
    uint256 public totalRequests = 0;

    event RequestSent(bytes32 reqId);
    event RequestReceived(uint256 data);
    event RequestReceivedV2(bytes32 reqId, uint256 data);

    constructor(address _bridge) {
        bridge = _bridge;
    }

    /**
     * @notice send request like second part of pool
     *
     * @dev LIFE CYCLE
     * @dev ${this pool} -> POOL_2
     * @dev ${this func} ->  bridge#transmitRequest -> node -> adpater#receiveRequest -> mockDexPool_2#receiveRequestTest -> bridge#transmitResponse(reqId) -> node -> adpater#receiveResponse -> mockDexPool_1#setPendingRequestsDone
     *
     */
    function sendRequestTestV2(uint256 testData_, address secondPartPool, address oppBridge, uint chainId) external {
        require(secondPartPool != address(0), "BAD ADDRESS");
        // todo some stuff on this part pool
        // ...

        uint256 nonce = Bridge(bridge).getNonce(msg.sender);
        bytes32 requestId = Bridge(bridge).prepareRqId(
            bytes32(uint256(uint160(oppBridge))),
            chainId,
            bytes32(uint256(uint160(secondPartPool))),
            bytes32(uint256(uint160(msg.sender))),
            nonce
        );
        bytes memory output = abi.encodeWithSelector(
            bytes4(keccak256(bytes('receiveRequestTest(uint256,bytes32)'))),
            testData_,
            requestId
        );
        Bridge(bridge).transmitRequestV2(
            output, secondPartPool, oppBridge, chainId, requestId, msg.sender, nonce);

        emit RequestSent(requestId);
    }

    /**
     * @notice receive request on the second part of pool
     *
     * @dev LIFE CYCLE
     * @dev POOL_1 -> ${this pool}
     * @dev mockDexPool_1#sendRequestTest -> bridge#transmitRequest -> node -> adpater#receiveRequest -> ${this func} -> bridge#transmitResponse(reqId) -> node -> adpater#receiveResponse -> mockDexPool_1#setPendingRequestsDone
     */
    function receiveRequestTest(uint256 _testData, bytes32 _reqId) public {
        require(msg.sender == bridge, "ONLY CERTAIN BRIDGE");

        if (requests[_reqId] != 0) {
            doubleRequestIds.push(_reqId);
        }
        requests[_reqId]++;
        totalRequests++;

        testData = _testData;
        emit RequestReceived(_testData);
        emit RequestReceivedV2(_reqId, _testData);
    }

    function sendTestRequestToSolana(bytes32 testStubPID_, bytes32 solBridgePID_, bytes32 dataAcc_, bytes32 bridgePDASigner_, uint256 testData_, uint chainId) external {
        testData_; // silence warning

        require(chainId == SOLANA_CHAIN_ID, "incorrect chainId");
        uint256 nonce = Bridge(bridge).getNonce(msg.sender);

        bytes32 requestId = Bridge(bridge).prepareRqId( testStubPID_, chainId, dataAcc_, bytes32(uint256(uint160(msg.sender))) , nonce);
//                        bool success = Bridge(bridge).transmitSolanaRequest(out, secondPartPool, oppBridge, chainId, requestId, msg.sender, nonce);
        SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](2);

        accounts[0] = SolanaAccountMeta({
        pubkey: dataAcc_,
        isSigner: false,
        isWritable: true
        });

        accounts[1] = SolanaAccountMeta({
        pubkey: bridgePDASigner_,
        isSigner: true,
        isWritable: true
        });

        Bridge(bridge).transmitRequestV2ToSolana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                /* programId: */
                    testStubPID_,
                /* accounts: */
                    accounts,
                /* data: */
                    abi.encodePacked(SET_VALUE_SIGHASH, testData_)
                )
            ),
                testStubPID_,
                solBridgePID_,
            SOLANA_CHAIN_ID,
            requestId,
            msg.sender,
            nonce
        );

        emit RequestSent(requestId);
    }

    function sigHash(string memory _data) public pure returns (bytes8) {
        return bytes8(sha256(bytes(_data)));
    }

    function doubles() public view returns(bytes32[] memory) {
        return doubleRequestIds;
    }

    function doubleRequestError() public view returns(uint256) {
        return doubleRequestIds.length;
    }

    function clearStats() public {
        delete doubleRequestIds;
        totalRequests = 0;
    }
}
