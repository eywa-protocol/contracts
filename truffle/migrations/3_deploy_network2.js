const { exec } = require('child_process');

const Bridge    = artifacts.require('Bridge')
const { LinkToken } = require('@chainlink/contracts/truffle/v0.4/LinkToken')
const { Oracle }    = require('@chainlink/contracts/truffle/v0.6/Oracle')
// const DexPool       = artifacts.require('DexPool')
// const { Hexstring } = require('../lib/Hexstring')
// const DaiToken      = artifacts.require('DaiToken')

const { writeEnv } = require('../utils/helper');


module.exports = async (deployer, network, accounts) => {

  /**
  *   Local (development) networks need their own deployment of the LINK token and the Oracle contract
  */

  if (network.startsWith('network2')) {

            LinkToken.setProvider(deployer.provider)
            // Hexstring.setProvider(deployer.provider)
            Oracle.setProvider(deployer.provider);

            try {

              //                 await deployer.deploy(DaiToken, { from: accounts[0] })
              // let tokenpool = await DaiToken.deployed();
              let tokenpool = { address: '0x0000000000000000000000000000000000000000'};

              //                 await deployer.deploy(Hexstring, { from: accounts[0] })
              // let hexstring = await Hexstring.deployed();

                              await deployer.deploy(LinkToken, { from: accounts[0] })
              let linkToken = await LinkToken.deployed();

                              await deployer.deploy(Oracle, LinkToken.address, { from: accounts[0] })
              let oracle    = await Oracle.deployed();

                              await deployer.deploy(Bridge, LinkToken.address, oracle.address, { from: accounts[0] })
              let client    = await Bridge.deployed();

              //                 await deployer.deploy(DexPool, tokenpool.address, client.address, hexstring.address);
              // let dexPool   = await DexPool.deployed();
              let dexPool = { address: '0x0000000000000000000000000000000000000000'};


              await writeEnv(linkToken.address, oracle.address, client.address, dexPool.address, tokenpool.address, 'network2');

              console.log('>> Generate env for external adapter in network1  (i.e. for connect to network 2)')
              let env_file_with_nums = "env_connect_to_network_with_nums_2.env";
              let network_url = "ws://172.20.128.12:8545"
              exec(`${process.cwd()}/scripts/bash/update_env_adapter_new.sh 8081 network2 ${dexPool.address} ${oracle.address}  ${tokenpool.address} ${client.address} ${network_url} ${env_file_with_nums} `, { maxBuffer: 1024 * 100000000 }, (err, stdout, stderr) => {
                if (err) {
                    console.log('THROW ERROR', err);
                    return;
                }

              });

                let env_file = "env_connect_to_network_2.env";
                exec(`${process.cwd()}/scripts/bash/update_env_adapter.sh 8081 network2 ${dexPool.address} ${oracle.address}  ${tokenpool.address} ${client.address} ${env_file} `, { maxBuffer: 1024 * 100000000 }, (err, stdout, stderr) => {
                    if (err) {
                        console.log('THROW ERROR', err);
                        return;
                    }
                });
                exec(`${process.cwd()}/scripts/bash/combine_env_adapters.sh`, { maxBuffer: 1024 * 100000000 }, (err, stdout, stderr) => {
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
