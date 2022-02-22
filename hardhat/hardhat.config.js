require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-vyper");
require("hardhat-gas-reporter");
require('@openzeppelin/hardhat-upgrades');

require('dotenv').config();
const networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : './helper-hardhat-config.json');

const PRIVATE_KEY_RINKEBY  = process.env.PRIVATE_KEY_RINKEBY  || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_BSC      = process.env.PRIVATE_KEY_BSC      || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_MUMBAI   = process.env.PRIVATE_KEY_MUMBAI   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_GANACHE  = process.env.PRIVATE_KEY_GANACHE  || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_HECO     = process.env.PRIVATE_KEY_HECO     || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_AVALANCHETESTNET = process.env.PRIVATE_KEY_AVALANCHETESTNET || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_METISTESTNET     = process.env.PRIVATE_KEY_METISTESTNET     || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_COINEXTESTNET    = process.env.PRIVATE_KEY_COINEXTESTNET    || "0x0000000000000000000000000000000000000000";

task("balanceDeployer", "Print info about balance deployer", async () => {
  const [deployer] = await ethers.getSigners();
  const balance    = await deployer.getBalance();
  console.log("Deployer balance: ",ethers.utils.formatEther(balance));

});

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {

    },
    localhost: {
        //
    },
    coinextestnet:{
      url: networkConfig.coinextestnet.rpcUrl2,
      accounts: [PRIVATE_KEY_COINEXTESTNET]
    },
    metistestnet:{
      url: networkConfig.metistestnet.rpcUrl2,
      accounts: [PRIVATE_KEY_METISTESTNET]
    },
    avalanchetestnet:{
      url: networkConfig.avalanchetestnet.rpcUrl2,
      accounts: [PRIVATE_KEY_AVALANCHETESTNET]
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
        accounts: [PRIVATE_KEY_MUMBAI],
        gasPrice: 2_000_000_000

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
    apiKey: {
        rinkeby: process.env.ETHERSCAN_API_KEY,
        bscTestnet: process.env.BINANCESCAN_API_KEY,
        polygonMumbai: process.env.POLYGONSCAN_API_KEY,
        avalancheFujiTestnet: process.env.AVALANCHESCAN_API_KEY,
        hecoTestnet: process.env.HECOINFOSCAN_API_KEY
    }
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 100,
    // enabled: process.env.REPORT_GAS ? true : false,
  },
  solidity: {
    compilers: [{
      version: "0.8.10",
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
  vyper: {
    compilers: [{ version: "0.2.4" }, { version: "0.2.7" }, { version: "0.3.1" }],
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
