require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
const env = require('dotenv').config({ path: '../.env' });
const networkConfig = require('../helper-hardhat-config.json');

const RINKEBY_PRIVATE_KEY = env.parsed.PRIVATE_KEY_RINKEBY || "";
const BSC_PRIVATE_KEY     = env.parsed.PRIVATE_KEY_BSC     || "";
const MUMBAI_PRIVATE_KEY  = env.parsed.PRIVATE_KEY_MUMBAI  || "";
const GANACHE_PRIVATE_KEY = env.parsed.PRIVATE_KEY_GANACHE || "";
const ETHERSCAN_API_KEY   = env.parsed.ETHERSCAN_API_KEY    || "";
const BINANCESCAN_API_KEY = env.parsed.BINANCESCAN_API_KEY  || "";


//TODO: Need to resolve dynamic initialization for apiKey. Now it is wrong working.
async function getKey(network) {
  if(network === 'rinkeby')    {console.log(ETHERSCAN_API_KEY); return ETHERSCAN_API_KEY;}
  if(network === 'bsctestnet') {console.log(BINANCESCAN_API_KEY);return BINANCESCAN_API_KEY;}
}


module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            // // If you want to do some forking, uncomment this
            // forking: {
            //   url: MAINNET_RPC_URL
            // }
        },
        localhost: {
        },
        rinkeby: {
            url:  networkConfig.rinkeby.rpcUrl,
            accounts: [RINKEBY_PRIVATE_KEY]
        },
        bsctestnet: {
            url:  networkConfig.bsctestnet.rpcUrl,
            accounts: [BSC_PRIVATE_KEY]
        },
        mumbai:{
           url:  networkConfig.mumbai.rpcUrl,
           accounts: [MUMBAI_PRIVATE_KEY]
        },
        network1: {
             url: networkConfig.network1.rpcUrl.replace('ws','http'),
             accounts:[env.parsed.PRIVATE_KEY_NETWORK1]

        },
        network2: {
	     url: networkConfig.network2.rpcUrl.replace('ws','http'),
             accounts:[env.parsed.PRIVATE_KEY_NETWORK2]
        },
        network3: {
             url: networkConfig.network3.rpcUrl.replace('ws','http'),
             accounts:[env.parsed.PRIVATE_KEY_NETWORK3]
        },
        ganache: {
             url:  networkConfig.ganache.rpcUrl,
             accounts: [GANACHE_PRIVATE_KEY]
        }
    },
    etherscan: {
      apiKey: getKey(process.argv[5] || process.env.HARDHAT_NETWORK)
    },
    gasReporter: {
      currency: "USD",
      gasPrice: 100,
      // enabled: process.env.REPORT_GAS ? true : false,
    },
    solidity: {
        compilers: [{
                version: "0.7.6",
                settings: {
                  optimizer: {
                    enabled: true,
                    runs: 200
                  }
                }
            }]
    },
    mocha: {
        timeout: 100000
    }
};
