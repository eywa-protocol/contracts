require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

const env = require('dotenv').config({ path: '../../.env' })
const networkConfig = require('./helper-hardhat-config.json');

const PRIVATE_KEY_RINKEBY = env.parsed.PRIVATE_KEY_RINKEBY || "";
const PRIVATE_KEY_BSC     = env.parsed.PRIVATE_KEY_BSC     || "";
const PRIVATE_KEY_MUMBAI  = env.parsed.PRIVATE_KEY_MUMBAI  || "";
const PRIVATE_KEY_GANACHE = env.parsed.PRIVATE_KEY_GANACHE || "";
const ETHERSCAN_API_KEY   = env.parsed.ETHERSCAN_API_KEY    || "";
const BINANCESCAN_API_KEY = env.parsed.BINANCESCAN_API_KEY  || "";
const PRIVATE_KEY_HECO    = env.parsed.PRIVATE_KEY_HECO     || "";

//TODO: Need to resolve dynamic initialization for apiKey. Now it is wrong working.
async function getKey(network) {
  if (network === 'rinkeby')    { console.log(ETHERSCAN_API_KEY); return ETHERSCAN_API_KEY; }
  if (network === 'bsctestnet') { console.log(BINANCESCAN_API_KEY); return BINANCESCAN_API_KEY; }
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
        //
    },
    rinkeby: {
      url: networkConfig.rinkeby.rpcUrl.replace('ws','http').replace('ws/',''),
      accounts: [PRIVATE_KEY_RINKEBY]
    },
    bsctestnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      accounts: [PRIVATE_KEY_BSC]
    },
    mumbai:{
        url: networkConfig.mumbai.rpcUrl.replace('ws','http').replace('ws/',''),
        accounts: [PRIVATE_KEY_MUMBAI]
    },
    network1: {
       url: networkConfig.network1.rpcUrl.replace('ws','http'),
       accounts: [env.parsed.PRIVATE_KEY_NETWORK1]
    },
    network2: {
      url: networkConfig.network2.rpcUrl.replace('ws','http'),
      accounts: [env.parsed.PRIVATE_KEY_NETWORK2]
    },
    network3: {
      url: networkConfig.network3.rpcUrl.replace('ws','http'),
      accounts: [env.parsed.PRIVATE_KEY_NETWORK3]
    },
    ganache: {
      url: networkConfig.ganache.rpcUrl,
      accounts: [PRIVATE_KEY_GANACHE]
    },
    hecotestnet:{
      url: networkConfig.hecotestnet.rpcUrl.split('ws').join('http'),
      accounts: [PRIVATE_KEY_HECO]
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
      version: "0.8.0",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }, {
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
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};
