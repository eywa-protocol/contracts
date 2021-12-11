"use strict";
const { RelayProvider } = require('@opengsn/provider');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');
const web3 = new Web3();
const { networks } = require('../hardhat.config');
const network = require('../helper-hardhat-config.json')
const env = require('dotenv').config({ path: `./.env` });

function toWei(n) { return web3.utils.toWei(n, 'ether'); }
function fromWei(n) { return web3.utils.fromWei(n, 'ether'); }

const checkoutProvider = (argv) => {

    if (argv.typenet === 'devstand') {

        const web3Net1 = new Web3.providers.WebsocketProvider(networks[argv.net1].url.replace('http', 'ws'));
        const web3Net2 = new Web3.providers.WebsocketProvider(networks[argv.net2].url.replace('http', 'ws'));
        const web3Net3 = new Web3.providers.WebsocketProvider(networks[argv.net3].url.replace('http', 'ws'));

        return { web3Net1, web3Net2, web3Net3 };
    }

    if (argv.typenet === 'teststand') {
        const web3Net1 = new HDWalletProvider(env.parsed[getPk(argv.net1)], network[argv.net1].rpcUrl);
        const web3Net2 = new HDWalletProvider(env.parsed[getPk(argv.net2)], network[argv.net2].rpcUrl);
        const web3Net3 = argv?.net3 !== void 0 ? new HDWalletProvider(env.parsed[getPk(argv.net3)], network[argv.net3].rpcUrl) : void 0;

        return { web3Net1, web3Net2, web3Net3 };
    }

};

const getPk = (nameNetwork) => {
    return Object.keys(env.parsed).filter(v => nameNetwork.indexOf(v.split("_")[2].toLowerCase()) >= 0)[0];
};

const timeout = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const chainId = (nameNetwork) => {
    return network[nameNetwork].chainId;
};

/** This workaround for testnet, because HDWalletProvider does't work correctly with gsnProvider. */
const specialQuikHackProvider = (net) => {
    if (net === 'rinkeby') return new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws/v3/ab95bf9f6dd743e6a8526579b76fe358');

    return null;
};

const makeGsnProvider = async (adr_paymaster, currentProvider, adr_token) => {
    /* override for useful usage  */
    const asyncApprovalData = async function (relayRequest) {
        return Promise.resolve('0x')
    };

    /* override for useful usage  */
    const asyncPaymasterData = async function (relayRequest) {
        return Promise.resolve(web3.eth.abi.encodeParameter('address', adr_token))
    };

    /* prepare gasless wrap for provider */
    let provider = await RelayProvider.newProvider({
        provider: currentProvider,
        overrideDependencies: { asyncApprovalData, asyncPaymasterData },
        config: {
            loggerConfiguration: { logLevel: 'error' },
            //auditorsCount: 0,
            paymasterAddress: adr_paymaster
            //,preferredRelays: ['https://relay.dev1.idfly.ru/gsn1']
        }
    }).init();

    return provider;
};


const addressToBytes32 = (address) => {
    return '0x' + web3.utils.padLeft(address.replace('0x', ''), 64);
}

const getCreate2Address = (creatorAddress, saltHex, byteCode) => {
    return `0x${web3.utils.keccak256(`0x${[
        'ff',
        creatorAddress,
        saltHex,
        web3.utils.keccak256(byteCode)
    ].map(x => x.replace(/0x/, ''))
        .join('')}`).slice(-40)}`.toLowerCase()
}

const getRepresentation = async (realToken, synthesisAddress) => {
    const SyntERC20 = await ethers.getContractFactory('SyntERC20')
    const bytecodeWithParams = SyntERC20.bytecode + web3.eth.abi.encodeParameters(
        ['string', 'string'],
        ["e" + realToken.name, "e" + realToken.symbol]
    ).slice(2)
    const salt = web3.utils.keccak256(addressToBytes32(realToken.address))
    return web3.utils.toChecksumAddress(getCreate2Address(
        synthesisAddress,
        salt,
        bytecodeWithParams
    ))
}
module.exports = {
    toWei,
    fromWei,
    checkoutProvider,
    timeout,
    chainId,
    makeGsnProvider,
    specialQuikHackProvider,
    addressToBytes32,
    getCreate2Address,
    getRepresentation
};
