const { expect } = require('chai')
const { ethers } = require('hardhat');
const { constants, expectEvent, expectRevert, BN } = require('@openzeppelin/test-helpers');
const { parseEvent } = require('typechain');
const { ZERO_ADDRESS } = constants;
const { getAddress } = require('ethers').utils;


const ethUtil = require('ethereumjs-util');
// const ganache = require('ganache-cli');
const Web3 = require('web3');
let web3 = new Web3(null);
// const provider = ganache.provider();
// const web3 = new Web3(provider);



const EywaToken = artifacts.require('EywaToken');

// module.exports = {
//   signTypedData: function (web3, from, data) {
//     return new Promise(async (resolve, reject) => {
//       function cb(err, result) {
//         if (err) {
//           return reject(err);
//         }
//         if (result.error) {
//           return reject(result.error);
//         }

//         const sig = result.result;
//         const sig0 = sig.substring(2);
//         const r = "0x" + sig0.substring(0, 64);
//         const s = "0x" + sig0.substring(64, 128);
//         const v = parseInt(sig0.substring(128, 130), 16);

//         resolve({
//           data,
//           sig,
//           v, r, s
//         });
//       }
//       if (web3.currentProvider.isMetaMask) {
//         web3.currentProvider.sendAsync({
//           jsonrpc: "2.0",
//           method: "eth_signTypedData_v3",
//           params: [from, JSON.stringify(data)],
//           id: new Date().getTime()
//         }, cb);
//       } else {
//         let send = web3.currentProvider.sendAsync;
//         if (!send) send = web3.currentProvider.send;
//         send.bind(web3.currentProvider)({
//           jsonrpc: "2.0",
//           method: "eth_signTypedData",
//           params: [from, data],
//           id: new Date().getTime()
//         }, cb);
//       }
//     });
// }
// }

// async function sign(data, account) {
// 	return (await module.exports.signTypedData(web3, account, data));
// }

describe('Permit tests', () => {
    let tokenErc20;

    let harmonyChainID = 5;

    let accForSing = web3.eth.accounts.create();
    let ownerAddress = accForSing.address;
    let prKeyAddress = accForSing.privateKey;

    


    before(async () => {
        [adminDeployer, signAdmin, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

        const eywaToken = await ethers.getContractFactory('EywaToken');
        tokenErc20 = await eywaToken.deploy(ownerAddress, harmonyChainID);
        await tokenErc20.deployed();
    });
    it('ChainID is right', async function () {
        expect(await tokenErc20.getHarmonyChainID()).to.be.equal(harmonyChainID);
    });
    it('Signature is working right', async function () {
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let deadline = blockBefore.timestamp + 100000;


        let _PERMIT_TYPEHASH = web3.utils.soliditySha3("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

        let currentNonce = await tokenErc20.nonces(ownerAddress);
        console.log("nonce current = ", currentNonce)
        let structHash = web3.utils.soliditySha3(
            _PERMIT_TYPEHASH,
            ownerAddress, // owner
            addr2.address, // spender
            100, // value
            currentNonce,
            deadline
        );
        let typeHash = web3.utils.soliditySha3("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
        let nameHash = web3.utils.soliditySha3("EYWA-Token");
        let versionHash = web3.utils.soliditySha3("1");

        let domainSeparatorV4 = web3.utils.soliditySha3(
            typeHash,
            nameHash,
            versionHash,
            harmonyChainID,
            await tokenErc20.address
        );
        let toTypedDataHash = web3.utils.soliditySha3(
            "\x19\x01",
            domainSeparatorV4,
            structHash
        );
        let sigObj = ethUtil.ecsign(web3.utils.hexToBytes(toTypedDataHash), ethUtil.toBuffer(prKeyAddress));

        let r = ethUtil.bufferToHex(sigObj.r);
        let s = ethUtil.bufferToHex(sigObj.s);
        let v = sigObj.v;
        console.log("v = ", v);
        console.log("r = ", r);
        console.log("s = ", s);

        // var publicKey = ethUtil.ecrecover(web3.utils.hexToBytes(toTypedDataHash), v, r, s);
        // var sender = ethUtil.publicToAddress(publicKey);
        // var publicKey2 = ethUtil.ecrecover(web3.utils.hexToBytes(toTypedDataHash), sigObj.v, sigObj.r, sigObj.s);
        // var sender2 = ethUtil.publicToAddress(publicKey2);
        // console.log("ownerAddress = ", ownerAddress);
        // console.log("sender = ", sender);
        // console.log("sender = ", sender2);

        await tokenErc20.permit666(
            structHash,
            toTypedDataHash,

            ownerAddress,
            addr2.address,
            100,
            deadline,
            v,
            r,
            s
        );

        console.log("new nonce = ", await tokenErc20.nonces(ownerAddress))
    });


});