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
const abi = require('ethereumjs-abi');

const EywaToken = artifacts.require('EywaToken');


describe('Permit tests', () => {
    let tokenErc20;

    let harmonyChainID = 1666700000;

    let accForSing = web3.eth.accounts.create();
    let ownerAddress = accForSing.address;
    let prKeyAddress = accForSing.privateKey;

    before(async () => {
        [addr1] = await ethers.getSigners();

        const EywaToken = await ethers.getContractFactory('EywaToken');
        tokenErc20 = await EywaToken.deploy(ownerAddress, harmonyChainID);
        await tokenErc20.deployed();
        console.log("EYWA:", tokenErc20.address)
    });
    it('ChainID is right', async function () {
        expect(await tokenErc20.getCachedChainId()).to.be.equal(harmonyChainID);
    });
    it('Signature is working right', async function () {
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let deadline = blockBefore.timestamp + 100000;

        let _PERMIT_TYPEHASH = await web3.utils.soliditySha3("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

        let currentNonce = await tokenErc20.nonces(ownerAddress);
        console.log("nonce current = ", currentNonce)

        let thisABI = await web3.eth.abi.encodeParameters(
            [
                'bytes32',
                'address',
                'address',
                'uint256',
                'uint256',
                'uint256'
            ],
            [
                _PERMIT_TYPEHASH,
                ownerAddress, // owner
                addr1.address, // spender
                100, // value
                currentNonce,
                deadline
            ]
        );
        let structHash = await web3.utils.soliditySha3(
            thisABI
        );

        let domainSeparatorV4 = await tokenErc20.DOMAIN_SEPARATOR();
        let toTypedDataHash = await web3.utils.soliditySha3(
            "\x19\x01",
            domainSeparatorV4,
            structHash
        );
        let msg = await web3.utils.hexToBytes(toTypedDataHash)
        let sigObj = ethUtil.ecsign(new Uint8Array(msg), ethUtil.toBuffer(prKeyAddress));

        let r = ethUtil.bufferToHex(sigObj.r);
        let s = ethUtil.bufferToHex(sigObj.s);
        let v = sigObj.v;

        await tokenErc20.permit(
            ownerAddress,
            addr1.address,
            100,
            deadline,
            v,
            r,
            s
        );

        expect(await tokenErc20.nonces(ownerAddress)).to.be.equal(1);

        await expect(tokenErc20.permit(
            ownerAddress,
            addr1.address,
            100,
            deadline,
            v,
            r,
            s
        )).to.be.revertedWith('ERC20Permit: invalid signature');;
    });

});