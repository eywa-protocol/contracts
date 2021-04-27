const { exec } = require('child_process');

const MockDexPool = artifacts.require('MockDexPool');

module.exports = async (deployer, network, accounts) => {

  
  if (network === 'network1' || network === 'network2') {
     try {
             let env       = require('dotenv').config({ path: `${process.cwd()}/env_connect_to_${network}.env` });
             const [owner] = accounts;

                                        await deployer.deploy(MockDexPool, eval(`env.parsed.PROXY_${network.toUpperCase()}`),  { from: owner });
              let mockDexPool           = await MockDexPool.deployed();

              
              exec(`echo MOCKDEX_${network.toUpperCase()}=${mockDexPool.address} >> ${process.cwd()}/env_connect_to_${network}.env`
                   , { maxBuffer: 1024 * 100000000 }, (err, stdout, stderr) => {
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