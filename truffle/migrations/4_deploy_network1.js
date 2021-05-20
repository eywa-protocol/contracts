const { exec } = require('child_process');
const { encodeWithSignature } = require('../utils/helper');

const NodeList                          = artifacts.require('NodeList');
const Bridge                            = artifacts.require('Bridge');
const ProxyAdminBridge                  = artifacts.require('ProxyAdminBridge');
const TransparentUpgradeableProxyBridge = artifacts.require('TransparentUpgradeableProxyBridge');

module.exports = async (deployer, network, accounts) => {

  
  if (network === 'network1') {
     try {
              
              const [proxyAdminOwner, newAdmin, anotherAccount] = accounts;

                                        await deployer.deploy(NodeList, { from: proxyAdminOwner });
              let nodeList            = await NodeList.deployed();              

                                        await deployer.deploy(Bridge, nodeList.address, { from: proxyAdminOwner });
              let bridge              = await Bridge.deployed();

                                        await deployer.deploy(ProxyAdminBridge, { from: proxyAdminOwner });
              const initializeData    = encodeWithSignature(nodeList.address);                                        console.log('$$$$$$$$$$$$$$$$$', initializeData)
              let proxyAdminBridge    = await ProxyAdminBridge.deployed();    
                                        await deployer.deploy(TransparentUpgradeableProxyBridge,
                                                              bridge.address,
                                                              proxyAdminBridge.address,
                                                              initializeData,
                                                              {from: proxyAdminOwner});

              let tupb                = await TransparentUpgradeableProxyBridge.deployed();

              
              let env_file = "env_connect_to_network1.env";
              exec(`${process.cwd()}/scripts/bash/update_env_adapter.sh 8081 NETWORK1 ${bridge.address} ${tupb.address}  ${proxyAdminBridge.address} ${env_file} ${nodeList.address}`
                  ,{ maxBuffer: 1024 * 100000000 }, (err, stdout, stderr) => {
                if (err) {
                    console.log('THROW ERROR', err);
                    return;
                }
              });

            } catch (err) {
              console.error(err)
            }
  
    }
}