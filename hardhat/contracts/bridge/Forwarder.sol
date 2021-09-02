// SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-newone/utils/cryptography/ECDSA.sol";
import "./interface/IForwarder.sol";

contract Forwarder is IForwarder {
    using ECDSA for bytes32;



    string public constant GENERIC_PARAMS = "address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data";

    mapping(bytes32 => bool) public typeHashes;

    // Nonces of senders, used to prevent replay attacks
    mapping(address => uint256) private nonces;

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    function getNonce(address from)
    public view override
    returns (uint256) {
        return nonces[from];
    }

    constructor() {
        string memory requestType = string(abi.encodePacked("ForwardRequest(", GENERIC_PARAMS, ")"));
        registerRequestTypeInternal(requestType);
    }

    function verify(
        ForwardRequest memory req,
        bytes32 domainSeparator,
        bytes32 requestTypeHash,
        bytes calldata suffixData,
        bytes calldata sig)
    external override view {

        _verifyNonce(req);
        _verifySig(req, domainSeparator, requestTypeHash, suffixData, sig);
    }


    function execute(
        ForwardRequest memory req,
        bytes32 domainSeparator,
        bytes32 requestTypeHash,
        bytes memory suffixData,
        bytes calldata sig
    )
    external payable
    override
    returns (bool success, bytes memory ret) {
        _verifyNonce(req);
        _verifySig(req, domainSeparator, requestTypeHash, suffixData, sig);
        _updateNonce(req);

        // solhint-disable-next-line avoid-low-level-calls
        (success,ret) = req.to.call{gas : req.gas, value : req.value}(abi.encodePacked(req.data, req.from));

        // execute(req.to, abi.encodePacked(req.data, req.from));
        if (address(this).balance > 0) {
            //can't fail: req.from signed (off-chain) the request, so it must be an EOA...
            payable(req.from).transfer(address(this).balance);
        }
        return (success, ret);
    }


    function _verifyNonce(ForwardRequest memory req) internal view {
        require(nonces[req.from] == req.nonce, "nonce mismatch");
    }

    function _updateNonce(ForwardRequest memory req) internal {
        nonces[req.from]++;
    }

    function registerRequestType(string calldata typeName, string calldata typeSuffix) external override {

        for (uint i = 0; i < bytes(typeName).length; i++) {
            bytes1 c = bytes(typeName)[i];
            require(c != "(" && c != ")", "invalid typename");
        }

        string memory requestType = string(abi.encodePacked(typeName, "(", GENERIC_PARAMS, ",", typeSuffix));
        registerRequestTypeInternal(requestType);
    }

    function registerRequestTypeInternal(string memory requestType) internal {

        bytes32 requestTypehash = keccak256(bytes(requestType));
        typeHashes[requestTypehash] = true;
        emit RequestTypeRegistered(requestTypehash, string(requestType));
    }


    event RequestTypeRegistered(bytes32 indexed typeHash, string typeStr);


    function _verifySig(
        ForwardRequest memory req,
        bytes32 domainSeparator,
        bytes32 requestTypeHash,
        bytes memory suffixData,
        bytes memory sig)
    internal
    view
    {

        require(typeHashes[requestTypeHash], "invalid request typehash");
        bytes32 digest = keccak256(abi.encodePacked(
                "\x19\x01", domainSeparator,
                keccak256(_getEncoded(req, requestTypeHash, suffixData))
            ));
        require(digest.recover(sig) == req.from, "signature mismatch");
    }


    function getAbiEncodeRequest(ForwardRequest memory req, bytes memory reqAbiEncode) external view returns (bytes memory) {
        bytes memory qwe = abi.encode(
            req.from,
            req.to,
            req.value,
            req.gas,
            req.nonce/*,
            keccak256(req.data)*/
        );
        require(address(0) != req.from, "req.from");
        require(address(0) != req.to, "req.t0");
        require(0 != req.nonce, "req.nonce");
        require(keccak256(qwe) == keccak256(reqAbiEncode), "hashes not match");
        return qwe;
    }

    function _getEncoded(
        ForwardRequest memory req,
        bytes32 requestTypeHash,
        bytes memory suffixData
    )
    public
    pure
    returns (
        bytes memory
    ) {

        return abi.encodePacked(
            requestTypeHash,
            abi.encode(
                req.from,
                req.to,
                req.value,
                req.gas,
                req.nonce,
                keccak256(req.data)
            ),
            suffixData
        );
    }



    // github.com:gnosis/gp-v2-contracts/src/contracts/libraries/GPv2Interaction.sol:18

    function execute(address target, bytes memory callData) internal {

        uint256 value = uint256(0);
        uint256 len = callData.length;

        // NOTE: Use assembly to call the interaction instead of a low level
        // call for two reasons:
        // - We don't want to copy the return data, since we discard it for
        // interactions.
        // - Solidity will under certain conditions generate code to copy input
        // calldata twice to memory (the second being a "memcopy loop").
        // <https://github.com/gnosis/gp-v2-contracts/pull/417#issuecomment-775091258>
        // solhint-disable-next-line no-inline-assembly
        assembly {
        //            let freeMemoryPointer := mload(0x40)
        //            calldatacopy(freeMemoryPointer, callData.offset, callData.length)
            if iszero(
            call(
            gas(),
            target,
            value,
            callData,
            len,
            0,
            0
            )
            ) {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }


}
