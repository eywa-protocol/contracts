require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider')

const bscws     = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
// const rinkebyws = 'wss://rinkeby.infura.io/ws/v3/0f4453c71dd145c6b819bbbf60a96e9d';
const rinkebyws = 'wss://rinkeby.infura.io/ws/v3/ab95bf9f6dd743e6a8526579b76fe358';

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  networks: {

    development: {
     host: "127.0.0.1",
     port: 7545,
     network_id: "1337",
    },

    network1: {
     host: "127.0.0.1",
     port: 7545,
     network_id: "1337",
    },

    network2: {
     host: "127.0.0.1",
     port: 8545,
     network_id: "1337",
    },

    bsctestnet: {
       provider: () => new HDWalletProvider(process.env.TESTNET_BSC, bscws),
       network_id: 97,
       timeoutBlocks: 200  
    },
    rinkeby: {
       provider: () => new HDWalletProvider(process.env.TESTNET_RINKEBY, rinkebyws),
       network_id: 4,
       timeoutBlocks: 200  
    }  
    
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
       version: "0.8.0",    
       docker: true,   
       parser: "solcjs",
       settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};
