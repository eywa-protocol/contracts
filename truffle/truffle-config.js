require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider')

const bscws     = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
// const rinkebyws = 'wss://rinkeby.infura.io/ws/v3/0f4453c71dd145c6b819bbbf60a96e9d';
const rinkebyws = 'wss://rinkeby.infura.io/ws/v3/ab95bf9f6dd743e6a8526579b76fe358';


module.exports = {
  
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

    binancetestnet: {
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
  compilers: {
    solc: {
       version: "0.6.9",    
       docker: true,   
       parser: "solcjs",
       settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
        //evmVersion: "byzantium"
      }
    }
  }
}
