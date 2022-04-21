"use strict";
const { RelayProvider } = require('@opengsn/provider');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');
const web3 = new Web3();
const { networks } = require('../hardhat.config');
const network = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../helper-hardhat-config.json')
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

        let web3Net3_l;

        if (argv.net3 === undefined || argv.net3 === void 0 ) {
            web3Net3_l = void 0;
        } else {
            web3Net3_l = new HDWalletProvider(env.parsed[getPk(argv.net3)], network[argv.net3].rpcUrl);
        }

        const web3Net3 = web3Net3_l;
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

const getRepresentation = async (realToken, decimals, chainId, netwiker, synthesisAddress) => {
    const SyntERC20 = await ethers.getContractFactory('SyntERC20')
    const bytecodeWithParams = SyntERC20.bytecode + web3.eth.abi.encodeParameters(
        ['string', 'string', 'uint8', 'uint256', 'bytes32', 'string'],
        [`e${realToken.name}`, `e${realToken.symbol}(${netwiker})`, decimals, chainId, addressToBytes32(realToken.address), netwiker]
    ).slice(2)
    const salt = web3.utils.keccak256(addressToBytes32(realToken.address))
    return web3.utils.toChecksumAddress(getCreate2Address(
        synthesisAddress,
        salt,
        bytecodeWithParams
    ))
}

const getTxId = (userFrom, nonce, chainIdOpposite, chainIdCurrent, receiveSide, oppositeBridge) => {
    return web3.utils.soliditySha3(
        { type: 'bytes32', value:addressToBytes32(userFrom)},
        { type: 'uint256', value:nonce},
        { type: 'uint256', value:chainIdOpposite},
        { type: 'uint256', value:chainIdCurrent},
        { type: 'bytes32', value:addressToBytes32(receiveSide)},
        { type: 'bytes32', value:addressToBytes32(oppositeBridge)},
    );
}

const signWorkerPermit = async (
    userFrom,
    verifyingContract,
    workerExecutionPrice,
    executionHash,
    chainIdFrom,
    chainIdTo,
    userNonce,
    workerDeadline
)  => {
    const hashedName = ethers.utils.solidityKeccak256(
        ['string'],
        ["EYWA"]
    );
    const hashedVersion = ethers.utils.solidityKeccak256(
        ['string'],
        ["1"]
    );

    const typeHash = ethers.utils.solidityKeccak256(
        ['string'],
        ["EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"]
    );

    const domainSeparator = web3.eth.abi.encodeParameters(
        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
        [typeHash, hashedName, hashedVersion, chainIdFrom, verifyingContract]
    );

    const domainSeparatorHash = ethers.utils.solidityKeccak256(
        ['bytes'],
        [domainSeparator]
    );

    const delegatedCallWorkerPermitHash = ethers.utils.solidityKeccak256(
        ['string'],
        ["DelegatedCallWorkerPermit(address from,uint256 chainIdTo,uint256 executionPrice,bytes32 executionHash,uint256 nonce,uint256 deadline)"]
    );

    const workerStructHash = ethers.utils.solidityKeccak256(
        ['bytes32', 'address', 'uint256', 'uint256', 'bytes32', 'uint256', 'uint256'],
        [delegatedCallWorkerPermitHash, userFrom.address, chainIdTo, workerExecutionPrice, executionHash, userNonce.toString(), workerDeadline]
    );

    const workerMsgHash = ethers.utils.solidityKeccak256(
        ['string', 'bytes32', 'bytes32'],
        ['\x19\x01', domainSeparatorHash, workerStructHash]
    );
    
    return ethers.utils.splitSignature(await userFrom.signMessage(ethers.utils.arrayify(workerMsgHash)));
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
    getRepresentation,
    getTxId,
    signWorkerPermit
};
