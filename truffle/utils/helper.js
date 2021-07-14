"use strict";
const Web3 = require('web3');
const web3 = new Web3();
const { networks }         = require('../truffle-config');
const { RelayProvider }  = require( '@opengsn/provider');


function toWei(n) { return web3.utils.toWei(n, 'ether');}
function fromWei(n) { return web3.utils.fromWei(n, 'ether');}

/** This workaround for testnet. because HDWalletProvider does't work correctly with gsnProvider. */
const specialQuikHackProvider = (net) => {
    if(net === 'rinkeby') return new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws/v3/ab95bf9f6dd743e6a8526579b76fe358');

    return null;
}

const checkoutProvider = (argv) => {

  if(argv.typenet === 'devstand'){

    const web3Net1 = new Web3.providers.WebsocketProvider('ws://'+ networks[argv.net1].host +":"+ networks[argv.net1].port);
    const web3Net2 = new Web3.providers.WebsocketProvider('ws://'+ networks[argv.net2].host +":"+ networks[argv.net2].port);
    const web3Net3 = new Web3.providers.WebsocketProvider('ws://'+ networks[argv.net3].host +":"+ networks[argv.net3].port);

    return {web3Net1, web3Net2, web3Net3};
  }

  if(argv.typenet === 'teststand'){

    const web3Net1 = networks[argv.net1].provider();
    const web3Net2 = networks[argv.net2].provider();
    const web3Net3 = argv.net3 === void 0 ? {} : networks[argv.net3].provider();

    return {web3Net1, web3Net2, web3Net3};
  }
}

const timeout = async (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
}

const encodeWithSignature = (address) => {

  return web3.eth.abi.encodeFunctionCall({
      name: 'initialize',
      type: 'function',
      inputs: [{
          type: 'address',
          name: '_listNode'
      }]
  }, [address]);

}

const makeGsnProvider = async(adr_paymaster, currentProvider, adr_token) => {
    /* overide for useful usage  */
    const asyncApprovalData = async function (relayRequest){
      return Promise.resolve('0x')
    }
    /* overide for useful usage  */
    const asyncPaymasterData = async function (relayRequest) {
      return Promise.resolve(web3.eth.abi.encodeParameter('address', adr_token))


    }

    /* prepate gasless wrap for provider */
   let provider = await RelayProvider.newProvider({
      provider: currentProvider,
      overrideDependencies:{ asyncApprovalData, asyncPaymasterData },
      config: {
          loggerConfiguration: { logLevel: 'error' },
          //auditorsCount: 0,
          paymasterAddress: adr_paymaster
          //,preferredRelays: ['https://relay.dev1.idfly.ru/gsn1']
      }
   }).init();

    return provider;
}

module.exports = {
    toWei,
    fromWei,
    checkoutProvider,
    timeout,
    encodeWithSignature,
    makeGsnProvider,
    specialQuikHackProvider
};
