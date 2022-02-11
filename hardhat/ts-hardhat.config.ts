import '@typechain/hardhat';
import "@nomiclabs/hardhat-truffle5";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import '@1hive/hardhat-aragon'
import 'hardhat-deploy'

export default {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      // // If you want to do some forking, uncomment this
      // forking: {
      //   url: MAINNET_RPC_URL
      // }
    },
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
      version: "0.4.24",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }]
  }, aragon: {
    appEnsName: "counter.open.aragonpm.eth", // counter.open.aragonpm.eth
    appContractName: "TEST" // Counter
  },
  mocha: {
    timeout: 100000
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: 'artifacts-types',
    target: 'ethers-v5',
    alwaysGenerateOverloads: true,
    externalArtifacts: ['externalArtifacts/*.json'],
  },
};
