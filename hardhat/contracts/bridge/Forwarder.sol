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
        (success,ret) = req.to.call{gas : req.gas, value : req.value}(abi.encodePacked(req.data, req.from));
        require(success, string(ret));
//        (success, ret) = executeAssemblyForwarderRequest(req);
//        (success, ret) = execute2(req);
//        require(success, "call unsuccessful");
        return (success, ret);
    }




    function executeAssemblyForwarderRequest(ForwardRequest memory req) public returns (bool, bytes memory) {
        nonces[req.from] = req.nonce + 1;
        address target = req.to;
        uint value = req.value;
        bytes memory data = req.data;
        uint256 len = data.length;

        assembly {
            let freeMemoryPointer := mload(0x40)
            calldatacopy(freeMemoryPointer, 40, 192)
        if iszero(
        call(
        gas(),
        target,
        value,
        freeMemoryPointer,
        len,
        0,
        0
        )
        ) {
        returndatacopy(0, 0, returndatasize())
        revert(0, returndatasize())
        }
        }

        // Validate that the relayer has sent enough gas for the call.
        // See https://ronan.eth.link/blog/ethereum-gas-dangers/
        assert(gasleft() > req.gas / 63);
        bytes memory b = new bytes(1);
        b[0] = 0x05;
        return (true, b);
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


    function execute2(ForwardRequest memory req)
    public
    payable
    returns (bool, bytes memory)
    {
        nonces[req.from] = req.nonce + 1;

        (bool success, bytes memory returndata) = req.to.call{gas : req.gas, value : req.value}(
            abi.encodePacked(req.data, req.from)
        );
        // Validate that the relayer has sent enough gas for the call.
        // See https://ronan.eth.link/blog/ethereum-gas-dangers/
        assert(gasleft() > req.gas / 63);

        return (success, returndata);
    }




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





}
