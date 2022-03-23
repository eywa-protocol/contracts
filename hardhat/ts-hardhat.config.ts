import '@typechain/hardhat';
import "@nomiclabs/hardhat-truffle5";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";


export default {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      // // If you want to do some forking, uncomment this
      // forking: {
      //   url: MAINNET_RPC_URL
      // }
    },
    local: { 
      url: "http://127.0.0.1:8546",
      accounts: [
        '0x82fbb897465f75a8aeaca30e8ce487fc22e37ad77788f9c21e365f094456b43d',
        '0xb17814ea1c2cb50419b70ac53db95c1282d4a098a29c223071df6db588bbbdbd'
      ]
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
      version: "0.8.2",
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
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: 'scripts/bridge-ts/artifacts-types',
    target: 'ethers-v5',
    alwaysGenerateOverloads: true,
    externalArtifacts: ['externalArtifacts/*.json'],
  },
};
