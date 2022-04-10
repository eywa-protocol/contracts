const { expect } = require('chai')
const { ethers } = require('hardhat');
const { constants, expectEvent, expectRevert, BN } = require('@openzeppelin/test-helpers');
const { parseEvent } = require('typechain');
const { ZERO_ADDRESS } = constants;
const { getAddress } = require('ethers').utils

const EywaVesting = artifacts.require('EywaToken');


var ethUtil = require('ethereumjs-util');
const { beforeEach } = require('mocha');


describe('Vesting tests. Part 1', () => {
    let accForSing;
    let signAdminAddress;
    let signAdminPrKey;
    before(async () => {
        [initialOwner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();
        accForSing = web3.eth.accounts.create();
        signAdminAddress = accForSing.address;
        signAdminPrKey = accForSing.privateKey;


        const ERC20 = await ethers.getContractFactory('EywaToken');
        eywaToken = await ERC20.deploy("EywaToken", "realEywa", initialOwner.address, 1000);
        await eywaToken.deployed();
    });
    it('Initial owner has right balance', async function () {
        expect(await eywaToken.balanceOf(initialOwner.address)).to.be.equal(1000);
    });
    it('Burns right', async function () {
        let totalSupBefore = await eywaToken.totalSupply();
        let balanceBefore = await eywaToken.balanceOf(initialOwner.address);


        await eywaToken.connect(initialOwner).burn(333);
        let totalSupAfter = await eywaToken.totalSupply();
        let balanceAfter = await eywaToken.balanceOf(initialOwner.address);

        expect(parseInt(totalSupBefore) - parseInt(333)).to.be.equal(parseInt(totalSupAfter));
        expect(parseInt(balanceBefore) - parseInt(333)).to.be.equal(parseInt(balanceAfter));
    });

    it('Permit works', async function () {
        let nonce = parseInt(await eywaToken.nonces(signAdminAddress));
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let timestampBefore = blockBefore.timestamp;

        let deadline = timestampBefore + 1000000;

        let _PERMIT_TYPEHASH = web3.utils.soliditySha3("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");


        // let msgHash = web3.utils.soliditySha3(
        //     _PERMIT_TYPEHASH,
        //     signAdminAddress,
        //     addr1.address,
        //     500,
        //     nonce,
        //     deadline
        // );
        // let msgHash = ethUtil.hashPersonalMessage(
        //     ethUtil.toBuffer(_PERMIT_TYPEHASH),
        //     ethUtil.toBuffer(signAdminAddress),
        //     ethUtil.toBuffer(addr1.address),
        //     ethUtil.toBuffer(500),
        //     ethUtil.toBuffer(nonce),
        //     ethUtil.toBuffer(deadline)
        // );
        let msgHash = ethUtil.hashPersonalMessage(
            ethUtil.toBuffer(_PERMIT_TYPEHASH) +
            ethUtil.toBuffer(signAdminAddress) +
            ethUtil.toBuffer(addr1.address) +
            ethUtil.toBuffer(500) +
            ethUtil.toBuffer(nonce) +
            ethUtil.toBuffer(deadline)
        );
        var privateKey = ethUtil.toBuffer(signAdminPrKey)
        var sig = ethUtil.ecsign(msgHash, privateKey);
        var signature = ethUtil.toBuffer(sig);
        // var sigParams = ethUtil.fromRpcSig(signature);
        // await eywaToken.connect(addr3).permit(signAdminAddress, addr1.address, 500, deadline, sigParams.v, sigParams.r, sigParams.s);




    });
});