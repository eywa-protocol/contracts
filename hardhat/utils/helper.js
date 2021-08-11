"use strict";
const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');
const web3 = new Web3();
const { networks }         = require('../hardhat.config');
const network = require('../helper-hardhat-config.json')
const env  = require('dotenv').config({ path: `./.env` });

function toWei(n) { return web3.utils.toWei(n, 'ether');}
function fromWei(n) { return web3.utils.fromWei(n, 'ether');}




const checkoutProvider = (argv) => {

    if(argv.typenet === 'devstand'){

        const web3Net1 = new Web3.providers.WebsocketProvider(networks[argv.net1].url.replace('http','ws'));
        const web3Net2 = new Web3.providers.WebsocketProvider(networks[argv.net2].url.replace('http','ws'));
        const web3Net3 = new Web3.providers.WebsocketProvider(networks[argv.net3].url.replace('http','ws'));

        return {web3Net1, web3Net2, web3Net3};
    }

    if(argv.typenet === 'teststand'){
        const web3Net1 = new HDWalletProvider(env.parsed[getPk(argv.net1)], network[argv.net1].rpcUrl);
        const web3Net2 = new HDWalletProvider(env.parsed[getPk(argv.net2)], network[argv.net2].rpcUrl);
        const web3Net3 = argv?.net3 !== void 0 ? new HDWalletProvider(env.parsed[getPk(argv.net3)], network[argv.net3].rpcUrl)  : void 0;

        return {web3Net1, web3Net2, web3Net3};
    }

}

const getPk = (nameNetwork) => {
    return Object.keys(env.parsed).filter(v => nameNetwork.indexOf(v.split("_")[2].toLowerCase()) >= 0)[0];
}

const timeout = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const chainId = (nameNetwork) => {
    return network[nameNetwork].chainId;
}



module.exports = {
    toWei,
    fromWei,
    checkoutProvider,
    timeout,
    chainId
};
