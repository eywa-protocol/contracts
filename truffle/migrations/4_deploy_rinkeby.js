const { exec } = require('child_process');

const Bridge    = artifacts.require('Bridge')
// const DexPool       = artifacts.require('DexPool')
const { LinkToken } = require('@chainlink/contracts/truffle/v0.4/LinkToken')
const { Oracle }    = require('@chainlink/contracts/truffle/v0.6/Oracle')
// const { Hexstring } = require('../lib/Hexstring')

const { writeEnv, initAddresses } = require('../utils/helper');


module.exports = async (deployer, network, accounts) => {

  
  if (network === 'rinkeby') {
     try {
    
            LinkToken.setProvider(deployer.provider);
            Oracle.setProvider(deployer.provider);
            //Hexstring.setProvider(deployer.provider);

            let addresses = await initAddresses(network, null);

            const LINK_CONTRACT_ADDRESS   = addresses.LINK_CONTRACT_ADDRESS;
            const ORACLE_CONTRACT_ADDRESS = addresses.ORACLE_CONTRACT_ADDRESS;
            // const TOKENPOOL_ADDRESS       = addresses.TOKENPOOL_ADDRESS;
            const TOKENPOOL_ADDRESS       = '0x0000000000000000000000000000000000000000';

              //                 await deployer.deploy(Hexstring, { from: accounts[0] })
              // let hexstring = await Hexstring.deployed();

              let linkToken = await LinkToken.at(LINK_CONTRACT_ADDRESS);
              let oracle    = await Oracle.at(ORACLE_CONTRACT_ADDRESS);

                              await deployer.deploy(Bridge, linkToken.address, oracle.address, { from: accounts[0] })
              let client    = await Bridge.deployed();

              //                 await deployer.deploy(DexPool, TOKENPOOL_ADDRESS, client.address, hexstring.address);
              // let dexPool   = await DexPool.deployed();
              let dexPool = { address: '0x0000000000000000000000000000000000000000'};

              
              await writeEnv(linkToken.address, oracle.address, client.address, dexPool.address, TOKENPOOL_ADDRESS, 'rinkeby');
              let env_file = "env_connect_to_network_1.env";
              console.log('>> Generate env for external adapter in binancetestnet')
              exec(`${process.cwd()}/scripts/bash/update_env_adapter.sh 8082 rinkeby ${dexPool.address} ${oracle.address}  ${TOKENPOOL_ADDRESS} ${client.address} ${env_file}`, { maxBuffer: 1024 * 100000000 }, (err, stdout, stderr) => {
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
