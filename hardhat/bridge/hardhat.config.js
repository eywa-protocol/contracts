require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
const env = require('dotenv').config({ path: '../.env' })

const RINKEBY_PRIVATE_KEY = env.parsed.PRIVATE_KEY_RINKEBY || "";
const BSC_PRIVATE_KEY     = env.parsed.PRIVATE_KEY_BSC     || "";
const MUMBAI_PRIVATE_KEY  = env.parsed.PRIVATE_KEY_MUMBAI  || "";
const GANACHE_PRIVATE_KEY = env.parsed.PRIVATE_KEY_GANACHE || "";
const RINKEBY             = env.parsed.RINKEBY     || "";
const BSCTESNET           = env.parsed.BSCTESNET   || "";
const ETHERSCAN_API_KEY   = env.parsed.ETHERSCAN_API_KEY    || "";
const BINANCESCAN_API_KEY = env.parsed.BINANCESCAN_API_KEY  || "";
const MUMBAI              = env.parsed.MUMBAI     || "";

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
            url: RINKEBY,
            accounts: [RINKEBY_PRIVATE_KEY]
        },
        bsctestnet: {
            url: BSCTESNET,
            accounts: [BSC_PRIVATE_KEY]
        },
        mumbai:{
            url: MUMBAI,
            accounts: [MUMBAI_PRIVATE_KEY]
        },
        ganache: {
            url: 'http://127.0.0.1:8545',
            accounts: [GANACHE_PRIVATE_KEY]
        }
        // ,
        // ganache: {
        //     url: 'http://localhost:8545',
        //     accounts: {
        //         mnemonic: MNEMONIC,
        //     }
        // }
    },
    etherscan: {
      apiKey: ''
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
            }]
    },
    mocha: {
        timeout: 100000
    }
};
