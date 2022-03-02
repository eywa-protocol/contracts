import { ethers, upgrades } from 'hardhat';

import type { Bridge } from '../../../scripts/bridge-ts/artifacts-types/Bridge';
import type { Portal } from '../../../scripts/bridge-ts/artifacts-types/Portal';
import type { Synthesis } from '../../../scripts/bridge-ts/artifacts-types/Synthesis';
  
// {
//   bridge: '',
//   portal: '',
//   synthesis: '',
// };

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
  
    return {
      bridge: bridge.address,
      portal: portal.address,
      synthesis: synthesis.address,
    };
  };
  