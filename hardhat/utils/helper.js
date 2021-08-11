"use strict";
const Web3 = require('web3');
const web3 = new Web3();
const { networks } = require('../hardhat.config');

function toWei(n) { return web3.utils.toWei(n, 'ether'); }
function fromWei(n) { return web3.utils.fromWei(n, 'ether'); }

const checkoutProvider = (argv) => {

    if(argv.typenet === 'devstand'){

        const web3Net1 = new Web3.providers.WebsocketProvider(networks[argv.net1].url.replace('http','ws'));
        const web3Net2 = new Web3.providers.WebsocketProvider(networks[argv.net2].url.replace('http','ws'));
        const web3Net3 = new Web3.providers.WebsocketProvider(networks[argv.net3].url.replace('http','ws'));

        return { web3Net1, web3Net2, web3Net3 };
    }

    if(argv.typenet === 'teststand'){

        const web3Net1 = networks[argv.net1].provider();
        const web3Net2 = networks[argv.net2].provider();
        const web3Net3 = networks[argv.net3].provider();

        return { web3Net1, web3Net2, web3Net3 };
    }
};

const timeout = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

module.exports = {
    toWei,
    fromWei,
    checkoutProvider,
    timeout
};
