import { ethers, upgrades } from 'hardhat';

import type { Bridge } from '../../../scripts/bridge-ts/artifacts-types/Bridge';
import type { Portal } from '../../../scripts/bridge-ts/artifacts-types/Portal';
import type { Synthesis } from '../../../scripts/bridge-ts/artifacts-types/Synthesis';
  

export const deploy = async () => {
    const _Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await _Forwarder.deploy();
    await forwarder.deployed();
    console.log("Forwarder address:", forwarder.address);
  
    // Deploy Bridge
    const _Bridge = await ethers.getContractFactory("Bridge");
    const bridge = (await upgrades.deployProxy(_Bridge, [forwarder.address], { initializer: 'initialize' })) as Bridge;
    await bridge.deployed();
    console.log("Bridge address:", bridge.address);
  
    const _Portal = await ethers.getContractFactory("Portal");
    const portal = (await upgrades.deployProxy(_Portal, [bridge.address, forwarder.address], { initializer: 'initializeFunc' })) as Portal;
    await portal.deployed();
    console.log("Portal address:", portal.address);
  
    const _Synthesis = await ethers.getContractFactory("Synthesis");
    const synthesis = (await upgrades.deployProxy(_Synthesis, [bridge.address, forwarder.address], { initializer: 'initializeFunc' })) as Synthesis;
    await synthesis.deployed();
    console.log("Synthesis address:", synthesis.address);
  
    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    // this.listFutureTokens =  networkConfig[network.name].token;

    /*
    const Token = await ethers.getContractFactory("TestToken");
    let i = 0;
    for(let tkn of this.listFutureTokens){
        let token  = await Token.deploy(tkn.name, tkn.symbol);
        await token.deployed();
        console.log(`Token ${tkn.name} address: ${token.address} network ${network.name}`);
        networkConfig[network.name].token[i].address = token.address;
        i++;
    }
    */
    const _Token = await ethers.getContractFactory("TestToken");
    const token = await _Token.deploy('TestToken', 'TT');
    await token.deployed();

    return {
      bridge: bridge.address,
      portal: portal.address,
      synthesis: synthesis.address,
      tokens: [
        token.address,
      ]
    };
  };
  