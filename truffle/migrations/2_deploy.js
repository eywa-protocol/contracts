const argv = require('minimist')(process.argv.slice(2), {string: ['bridge', 'nodelist', 'mockdexpool', 'paymastergsn' ]});
const { exec } = require('child_process');

const NodeList                          = artifacts.require('NodeList');
const Bridge                            = artifacts.require('Bridge');
const MockDexPool                       = artifacts.require('MockDexPool');

const Portal                            = artifacts.require('Portal');
const Synthesis                         = artifacts.require('Synthesis');

const TokenPaymasterPermitPaymaster     = artifacts.require('TokenPaymasterPermitPaymaster');
const RelayHub                          = artifacts.require('RelayHub');


module.exports = async (deployer, network, accounts) => {

  if (network == "test") return; // test maintains own contracts
  let _network  = null;
  if (network === 'rinkeby')     _network = 'network1';
  if (network === 'bsctestnet')  _network = 'network2';
  if (network === 'mumbai')      _network = 'network3';


//if(network === 'rinkeby' || network === 'bsctestnet'){
     try {

          const [owner, anotherAccount] = accounts;


		  const relayHub  = network === 'rinkeby' ? '0x6650d69225CA31049DB7Bd210aE4671c0B1ca132' : network === 'bsctestnet' ? '0xAa3E82b4c4093b4bA13Cb5714382C99ADBf750cA' : undefined  // it is real openGSN addresess
		  const forwarder = network === 'rinkeby' ? '0x83A54884bE4657706785D7309cf46B58FE5f6e8a' : network === 'bsctestnet' ? '0xeB230bF62267E94e657b5cbE74bdcea78EB3a5AB' : undefined  // it is real openGSN trustedForwarder
		  const token     = network === 'rinkeby' ? "0x8aAFC440A5057cF8728c1C23fd74C25314c156ac" : network === 'bsctestnet' ? '0x8aAFC440A5057cF8728c1C23fd74C25314c156ac' : undefined;  // token should be in pool (uniswap, pancake and so >
		  const router    = network === 'rinkeby' ? "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" : network === 'bsctestnet' ? '0x8aAFC440A5057cF8728c1C23fd74C25314c156ac' : undefined;  // pool for certain network (uniswap, pancake and so>

		// the gsn  only for testnet
		if(!network.includes('network') && argv.paymastergsn === void 0){

		                                             await deployer.deploy(TokenPaymasterPermitPaymaster, { from: owner });
		            this.paymaster                 = await TokenPaymasterPermitPaymaster.deployed();
		                                             await this.paymaster.setRelayHub(relayHub);
		                                             await this.paymaster.setTrustedForwarder(forwarder);
		            this.relay                     = await RelayHub.at(relayHub);
		}

		this.paymaster = (this.paymaster  === void 0 && !network.includes('network')) ? await TokenPaymasterPermitPaymaster.at(argv.paymastergsn) : this.paymaster;

          if(argv.bridge === undefined){

                                        await deployer.deploy(NodeList, { from: owner });
              this.nodeList           = await NodeList.deployed();

                                        await deployer.deploy(Bridge, this.nodeList.address, { from: owner });
              this.bridge             = await Bridge.deployed();

                                        await deployer.deploy(MockDexPool, this.bridge.address, { from: owner });
              this.mockDexPool        = await MockDexPool.deployed();
                                        await this.bridge.updateDexBind(this.mockDexPool.address, true, {from: owner});

          }

              this.bridge   = this.bridge   === undefined ? await Bridge.at(argv.bridge) :     this.bridge;
              this.nodeList = this.nodeList === undefined ? await NodeList.at(argv.nodelist) : this.nodeList;
              this.mockDexPool = this.mockDexPool === undefined ? await MockDexPool.at(argv.mockdexpool) : this.mockDexPool;

                                        await deployer.deploy(Portal, this.bridge.address, forwarder, { from: owner });
              let portal              = await Portal.deployed();
  //                                      await this.bridge.updateDexBind(portal.address, true, {from: owner});

                                        await deployer.deploy(Synthesis, this.bridge.address, forwarder, { from: owner });
              let synthesis           = await Synthesis.deployed();
//                                        await this.bridge.updateDexBind(synthesis.address, true, {from: owner});



              let env_file = `env_connect_to_${_network}.env`;
              let n = _network.toUpperCase();
              exec(`${process.cwd()}/scripts/bash/update_env_adapter.sh create ${env_file} BRIDGE_${n}=${this.bridge.address} NODELIST_${n}=${this.nodeList.address} DEXPOOL_${n}=${this.mockDexPool.address} PORTAL_${n}=${portal.address} SYNTHESIS_${n}=${synthesis.address} PAYMASTER_${n}=${this.paymaster.address}`, { maxBuffer: 1024 * 100000000 }, (err, stdout, stderr) => {
                if (err) {
                    console.log('THROW ERROR', err);
                    return;
                }
              });

            } catch (err) {
              console.error(err)
            }
//  }
}
