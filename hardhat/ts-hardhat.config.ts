import '@typechain/hardhat';
import "@nomiclabs/hardhat-truffle5";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import '@1hive/hardhat-aragon'
import 'hardhat-deploy'

import networkConfig from './helper-hardhat-config.json';
require('dotenv').config();

export default {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      // // If you want to do some forking, uncomment this
      // forking: {
      //   url: MAINNET_RPC_URL
      // }
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
    appContractName: "TEST", // Counter
    appRoles: [
      {
        name: "Create new votes",
        id: "CREATE_VOTES_ROLE",
        params: [],
      },
      {
        name: "Modify support",
        id: "MODIFY_SUPPORT_ROLE",
        params: ["New support", "Current support"],
      },
      {
        name: "Modify quorum",
        id: "MODIFY_QUORUM_ROLE",
        params: ["New quorum", "Current quorum"],
      },
      {
        name: "Set the minimum required balance",
        id: "SET_MIN_BALANCE_ROLE",
        params: [],
      },
      {
        name: "Set the minimum required time between one user creating new votes",
        id: "SET_MIN_TIME_ROLE",
        params: [],
      },
      {
        name: "Enable vote creation",
        id: "ENABLE_VOTE_CREATION",
        params: [],
      },
      {
        name: "Disable vote creation",
        id: "DISABLE_VOTE_CREATION",
        params: [],
      },
    ],
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
