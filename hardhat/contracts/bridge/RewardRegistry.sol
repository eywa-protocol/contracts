//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

contract RewardRegistry {
    
   mapping(address=>bool) whitelist;
    
    constructor(address[] memory _address) {
      for (uint i = 0; i < _address.length; i++) {
       whitelist[_address[i]]=true;
      }
    }
    
    function relayerStatusCheck(address _addres) external view returns (bool){
        return whitelist[_addres];
    }
    
    function relayerStatusUpdate(address _relayAdrs)  external returns (bool){
        whitelist[_relayAdrs] = false;
        return true;
    }
}
    
