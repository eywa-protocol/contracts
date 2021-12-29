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

    string constant private SET_REQUEST_TYPE = "setRequest";
    uint256 public testData = 0;
    address public bridge;
    mapping(bytes32 => uint256) public requests;
    uint256 public doubleRequestError = 0;

    event RequestSent(bytes32 reqId, bool success);
    event RequestReceived(bytes32 reqId, uint256 data);

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
        bytes32 requestId = Bridge(bridge).prepareRqId(bytes32(uint256(uint160(oppBridge))),
                                                       chainId,
                                                       bytes32(uint256(uint160(secondPartPool))),
                                                       bytes32(uint256(uint160(msg.sender))),
                                                       nonce);
        bytes memory out  = abi.encodeWithSelector(bytes4(keccak256(bytes('receiveRequestTest(uint256, bytes32)'))), testData_, requestId);
        bool success = Bridge(bridge).transmitRequestV2(out, secondPartPool, oppBridge, chainId, requestId, msg.sender, nonce);

        emit RequestSent(requestId, success);
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
            doubleRequestError++;
        }
        requests[_reqId]++;

        testData = _testData;
        emit RequestReceived(_reqId, _testData);
    }

    function sendTestRequestToSolana(bytes32 programId_, uint256 testData_, bytes32 secondPartPool, bytes32 oppBridge, uint chainId) external {
        uint256 nonce = Bridge(bridge).getNonce(msg.sender);
        bytes memory out  = abi.encodeWithSelector(bytes4(keccak256(bytes('receiveRequestTest(uint256)'))), testData_);
        bytes32 requestId = Bridge(bridge).prepareRqId( oppBridge, chainId, secondPartPool, bytes32(uint256(uint160(msg.sender))) , nonce);
        //                bool success = Bridge(bridge).transmitSolanaRequest(out, secondPartPool, oppBridge, chainId, requestId, msg.sender, nonce);
        SolanaAccountMeta[] memory accounts = new SolanaAccountMeta[](2);

        accounts[0] = SolanaAccountMeta({
        pubkey: secondPartPool,
        isSigner: false,
        isWritable: true
        });

        accounts[1] = SolanaAccountMeta({
        pubkey: oppBridge,
        isSigner: false,
        isWritable: true
        });

        Bridge(bridge).transmitRequestV2_solana(
            serializeSolanaStandaloneInstruction(
                SolanaStandaloneInstruction(
                /* programId: */
                    programId_,
                /* accounts: */
                    accounts,
                /* data: */
                    abi.encodePacked(out)
                )
            ),
            secondPartPool,
            oppBridge,
            SOLANA_CHAIN_ID,
            requestId,
            msg.sender,
            nonce
        );

        emit RequestSent(requestId);
    }

}
