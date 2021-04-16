const { exec } = require('child_process');

const Bridge    = artifacts.require('Bridge')
//const DexPool       = artifacts.require('DexPool')
const { LinkToken } = require('@chainlink/contracts/truffle/v0.4/LinkToken')
const { Oracle }    = require('@chainlink/contracts/truffle/v0.6/Oracle')
// const BTCToken      = artifacts.require('BTCToken')


const { writeEnv } = require('../utils/helper');


module.exports = async (deployer, network, accounts) => {

  /**
  *   Local (development) networks need their own deployment of the LINK token and the Oracle contract
  */

  if (network.startsWith('network1')) {

            LinkToken.setProvider(deployer.provider)
            Oracle.setProvider(deployer.provider);

            try {

              //                 await deployer.deploy(BTCToken, { from: accounts[0] })
              // let tokenpool = await BTCToken.deployed();
              let tokenpool = { address: '0x0000000000000000000000000000000000000000'};

                              await deployer.deploy(LinkToken, { from: accounts[0] })
              let linkToken = await LinkToken.deployed();

                              await deployer.deploy(Oracle, LinkToken.address, { from: accounts[0] })
              let oracle    = await Oracle.deployed();

                              await deployer.deploy(Bridge, LinkToken.address, oracle.address, { from: accounts[0] })
              let client    = await Bridge.deployed();

              let dexPool = { address: '0x0000000000000000000000000000000000000000'};


              await writeEnv(linkToken.address, oracle.address, client.address, dexPool.address, tokenpool.address);
              let env_file_wtih_nums = "env_connect_to_network_with_nums_1.env";
              console.log('>> Generate env for external adapter in network2  (i.e. for connect to network 1)')
                let network_url = "ws://172.20.128.11:7545"

              exec(`${process.cwd()}/scripts/bash/update_env_adapter_new.sh 8082 network1 ${dexPool.address} ${oracle.address} ${tokenpool.address} ${client.address} ${network_url} ${env_file_wtih_nums} `, { maxBuffer: 1024 * 100000000 }, (err, stdout, stderr) => {
                if (err) {
                    console.log('THROW ERROR', err);
                    return;
                }


              });

                let env_file = "env_connect_to_network_1.env";
                exec(`${process.cwd()}/scripts/bash/update_env_adapter.sh 8082 network1 ${dexPool.address} ${oracle.address} ${tokenpool.address} ${client.address} ${env_file} `, { maxBuffer: 1024 * 100000000 }, (err, stdout, stderr) => {
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
