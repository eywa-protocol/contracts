require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

require('dotenv').config();
const networkConfig = require('./helper-hardhat-config.json');

const PRIVATE_KEY_RINKEBY  = process.env.PRIVATE_KEY_RINKEBY  || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_BSC      = process.env.PRIVATE_KEY_BSC      || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_MUMBAI   = process.env.PRIVATE_KEY_MUMBAI   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_GANACHE  = process.env.PRIVATE_KEY_GANACHE  || "0x0000000000000000000000000000000000000000";
const ETHERSCAN_API_KEY    = process.env.ETHERSCAN_API_KEY    || "0x0000000000000000000000000000000000000000";
const BINANCESCAN_API_KEY  = process.env.BINANCESCAN_API_KEY  || "0x0000000000000000000000000000000000000000";
const POLYGONSCAN_API_KEY  = process.env.POLYGONSCAN_API_KEY  || "0x0000000000000000000000000000000000000000";
const HECOINFOSCAN_API_KEY = process.env.HECOINFOSCAN_API_KEY || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_HECO     = process.env.PRIVATE_KEY_HECO     || "0x0000000000000000000000000000000000000000";

//TODO: Need to resolve dynamic initialization for apiKey. Now it is wrong working.
async function getKey(network) {
  if (network === 'rinkeby')    { console.log(ETHERSCAN_API_KEY); return ETHERSCAN_API_KEY; }
  if (network === 'bsctestnet') { console.log(BINANCESCAN_API_KEY); return BINANCESCAN_API_KEY; }
  if (network === 'mumbai') { console.log(POLYGONSCAN_API_KEY); return POLYGONSCAN_API_KEY; }
  if (network === 'hecotestnet') { console.log(HECOINFOSCAN_API_KEY); return HECOINFOSCAN_API_KEY; }
}


module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
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
        url: networkConfig.mumbai.rpcUrl.replace('ws','http').replace('-ws','-rpc'),
        accounts: [PRIVATE_KEY_MUMBAI]
    },
    network1: {
       url: networkConfig.network1.rpcUrl.replace('ws','http'),
       accounts: [process.env.PRIVATE_KEY_NETWORK1]
    },
    network2: {
      url: networkConfig.network2.rpcUrl.replace('ws','http'),
      accounts: [process.env.PRIVATE_KEY_NETWORK2]
    },
    network3: {
      url: networkConfig.network3.rpcUrl.replace('ws','http'),
      accounts: [process.env.PRIVATE_KEY_NETWORK3]
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
