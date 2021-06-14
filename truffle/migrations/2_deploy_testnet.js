const { exec } = require('child_process');

const NodeList                          = artifacts.require('NodeList');
const Bridge                            = artifacts.require('Bridge');

module.exports = async (deployer, network, accounts) => {

  
  if (network === 'rinkeby') {_network = 'network1'; }  
  if (network === 'bsctestnet') {_network = 'network2'; }  

     try {


              const [owner, anotherAccount] = accounts;

                                        await deployer.deploy(NodeList, { from: owner });
              let nodeList            = await NodeList.deployed();              

                                        await deployer.deploy(Bridge, nodeList.address, { from: owner });
              let bridge              = await Bridge.deployed();

              
              let env_file = `env_connect_to_${_network}.env`;
              exec(`${process.cwd()}/scripts/bash/update_env_adapter.sh 8081 ${_network.toUpperCase()} ${bridge.address} ${env_file} ${nodeList.address}  ""`, { maxBuffer: 1024 * 100000000 }, (err, stdout, stderr) => {
                if (err) {
                    console.log('THROW ERROR', err);
                    return;
                }
              });

            } catch (err) {
              console.error(err)
            }
  
    
}