require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-vyper");
require("hardhat-gas-reporter");
require('@openzeppelin/hardhat-upgrades');

require('dotenv').config();
const networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : './helper-hardhat-config.json');

const PRIVATE_KEY_ETHEREUM   = process.env.PRIVATE_KEY_ETHEREUM   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_RINKEBY  = process.env.PRIVATE_KEY_RINKEBY  || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_BSCTESTNET      = process.env.PRIVATE_KEY_BSCTESTNET      || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_MUMBAI   = process.env.PRIVATE_KEY_MUMBAI   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_GANACHE  = process.env.PRIVATE_KEY_GANACHE  || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_HECO     = process.env.PRIVATE_KEY_HECO     || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_AVALANCHETESTNET = process.env.PRIVATE_KEY_AVALANCHETESTNET || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_METISTESTNET     = process.env.PRIVATE_KEY_METISTESTNET     || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_COINEXTESTNET    = process.env.PRIVATE_KEY_COINEXTESTNET    || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_HARMONYLOCAL     = process.env.PRIVATE_KEY_HARMONYLOCAL     || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_HARMONYTESTNET   = process.env.PRIVATE_KEY_HARMONYTESTNET   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_HARMONY   = process.env.PRIVATE_KEY_HARMONY   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_BSC       = process.env.PRIVATE_KEY_BSC       || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_POLYGON   = process.env.PRIVATE_KEY_POLYGON   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_FANTOMTESTNET   = process.env.PRIVATE_KEY_FANTOMTESTNET   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_FANTOM   = process.env.PRIVATE_KEY_FANTOM   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_ARBITRUMTESTNET   = process.env.PRIVATE_KEY_ARBITRUMTESTNET   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_ARBITRUM   = process.env.PRIVATE_KEY_ARBITRUM   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_CRONOSTESTNET   = process.env.PRIVATE_KEY_CRONOSTESTNET   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_CRONOS   = process.env.PRIVATE_KEY_CRONOS   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_AURORATESTNET   = process.env.PRIVATE_KEY_AURORATESTNET   || "0x0000000000000000000000000000000000000000";
const PRIVATE_KEY_AURORA  = process.env.PRIVATE_KEY_AURORA   || "0x0000000000000000000000000000000000000000";


task("balanceDeployer", "Print info about balance deployer", async () => {
  const [deployer] = await ethers.getSigners();
  const balance    = await deployer.getBalance();
  console.log("Deployer balance: ",ethers.utils.formatEther(balance));

});
task("getBlockNum", "", async () => {
  console.log(`crutch=${await ethers.provider.getBlockNumber()}`);
});


module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {

    },
    localhost: {
        //
    },
    harmonylocal:{
      url: networkConfig.harmonylocal.rpcUrl2,
      accounts: [PRIVATE_KEY_HARMONYLOCAL]
    },
    polygon:{
      url: networkConfig.polygon.rpcUrl2,
      accounts: [PRIVATE_KEY_POLYGON]
    },
    bsc: {
      url: networkConfig.bsc.rpcUrl2,
      accounts: [PRIVATE_KEY_BSC]
    },
    harmony:{
      url: networkConfig.harmony.rpcUrl2,
      accounts: [PRIVATE_KEY_HARMONY]
    },
    harmonytestnet:{
      url: networkConfig.harmonytestnet.rpcUrl2,
      accounts: [PRIVATE_KEY_HARMONYTESTNET]
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
    ethereum: {
      url: networkConfig.ethereum.rpcUrl2,
      accounts: [PRIVATE_KEY_ETHEREUM]
    },
    rinkeby: {
      url: networkConfig.rinkeby.rpcUrl2,
      accounts: [PRIVATE_KEY_RINKEBY]
    },
    bsctestnet: {
      url: networkConfig.bsctestnet.rpcUrl2,
      accounts: [PRIVATE_KEY_BSCTESTNET]
    },
    fantomtestnet:{
      url: networkConfig.fantomtestnet.rpcUrl2,
      accounts: [PRIVATE_KEY_FANTOMTESTNET]
    },
    fantom:{
      url: networkConfig.fantom.rpcUrl2,
      accounts: [PRIVATE_KEY_FANTOM]
    },
    arbitrum:{
      url: networkConfig.arbitrum.rpcUrl2,
      accounts: [PRIVATE_KEY_ARBITRUM]
    },
    arbitrumtestnet:{
      url: networkConfig.arbitrumtestnet.rpcUrl2,
      accounts: [PRIVATE_KEY_ARBITRUMTESTNET]
    },
    cronos:{
      url: networkConfig.cronos.rpcUrl2,
      accounts: [PRIVATE_KEY_CRONOS]
    },
    cronostestnet:{
      url: networkConfig.cronostestnet.rpcUrl2,
      accounts: [PRIVATE_KEY_CRONOSTESTNET]
    },
    aurora:{
      url: networkConfig.aurora.rpcUrl2,
      accounts: [PRIVATE_KEY_AURORA]
    },
    auroratestnet:{
      url: networkConfig.auroratestnet.rpcUrl2,
      accounts: [PRIVATE_KEY_AURORATESTNET]
    },
    mumbai:{
        url: networkConfig.mumbai.rpcUrl2,
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
    }, {
      version: "0.8.2",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }, {
      version: "0.4.24",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }]
  },
  vyper: {
    compilers: [{ version: "0.2.4" }, { version: "0.2.7" }, { version: "0.2.8" },{ version: "0.3.1" }],
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
