pragma solidity 0.5.17;

import "./BLS.sol";

contract BLSChecker {
    bool verified;

    function checkBLSSignature(bytes memory _groupPubKey, bytes memory _currentRequestPreviousEntry, bytes memory _groupSignature) public {
            require(
            BLS.verify(
                _groupPubKey,
                _currentRequestPreviousEntry,
                _groupSignature
            ),
            "Invalid signature"
        );
        setVerified(true);
    }


    function getVerified() external view returns (bool){
        return verified;
    }

    function setVerified(bool input) internal{
        verified = input;
    }


    function viewBLSSignature(bytes memory groupPubKey, bytes memory currentRequestPreviousEntry, bytes memory groupSignature) public view returns(bool){
            return BLS.verifyBytes(groupPubKey, currentRequestPreviousEntry, groupSignature);
    }
}
