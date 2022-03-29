const { expect } = require('chai')
const { ethers } = require('hardhat');
const { constants, expectEvent, expectRevert, BN } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const EywaVesting = artifacts.require('EywaVesting');
const PermitERC20 = artifacts.require('PermitERC20');


async function setNetworkTime(timestamp) {
    await network.provider.send("evm_setNextBlockTimestamp", [timestamp])
    await network.provider.send("evm_mine")
  }
  
const increaseTime = async (duration) => {
    if (!ethers.BigNumber.isBigNumber(duration)) {
        duration = ethers.BigNumber.from(duration);
    }

    if (duration.isNegative())
        throw Error(`Cannot increase time by a negative amount (${duration})`);

    await hre.network.provider.request({
        method: "evm_increaseTime",
        params: [duration.toNumber()],
    });

    await hre.network.provider.request({
        method: "evm_mine",
    });
};

const takeSnapshot = async () => {
    return await hre.network.provider.request({
      method: "evm_snapshot",
      params: [],
    })
  };
  
const restoreSnapshot = async (id) => {
await hre.network.provider.request({
    method: "evm_revert",
    params: [id],
});
};

const useSnapshot = async () => {
await restoreSnapshot(snapshotId);
snapshotId = await takeSnapshot();
};


// contract('RelayerPool', function (accounts) {
describe('Vesting tests', () => {
    let tokenErc20;
    let vesting;
    let adminDeployer;
    let signAdmin;
    let addr1;
    let addr2;
    let addr3;
    let addrs;
    let day_in_seconds = 86400;

    before(async () => {
        const ERC20 = await ethers.getContractFactory('PermitERC20');
        tokenErc20 = await ERC20.deploy("PermitERC20 token", "prmt20t");
        await tokenErc20.deployed();
        [adminDeployer, signAdmin, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();
        const Vesting = await ethers.getContractFactory('EywaVesting');
        vesting = await Vesting.deploy(
            adminDeployer.address
        );
        await vesting.deployed();
        
        await tokenErc20.mint(adminDeployer.address, 10000000, {from: adminDeployer.address});
        expect(await tokenErc20.balanceOf(adminDeployer.address, {from: adminDeployer.address})).to.equal(10000000);
        await tokenErc20.approve(vesting.address, 10000000, {from: adminDeployer.address});
        expect(await tokenErc20.allowance(adminDeployer.address, vesting.address, {from: adminDeployer.address})).to.equal(10000000);
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let timestampBefore = blockBefore.timestamp;
        await vesting.initialize(
            tokenErc20.address, 
            timestampBefore + day_in_seconds, 
            day_in_seconds * 50,
            day_in_seconds * 10,
            10000000 / 2,
            (10000000 / 2) / 10,
            10,
            signAdmin.address,
            day_in_seconds * 10,
            [addr1.address, addr2.address, addr3.address],
            [10000000 / 2, 10000000 / 4, 10000000 / 4],
            {from: adminDeployer.address}
        );
        expect(await vesting.cliffAmount()).to.equal(10000000 / 2);
        expect(await vesting.stepAmount()).to.equal((10000000 / 2)/10);
        });
    it('cannot be reInitialize', async function () {
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let timestampBefore = blockBefore.timestamp;
        await expect(vesting.initialize(
            tokenErc20.address, 
            timestampBefore + day_in_seconds, 
            day_in_seconds * 100,
            day_in_seconds * 14,
            400 / 2,
            (400 / 2) / 10,
            8,
            signAdmin.address,
            day_in_seconds * 10,
            [addr1.address, addr2.address, addr3.address],
            [400 / 2, 400 / 4, 400 / 4],
            {from: adminDeployer.address}
        )).to.be.revertedWith('Contract is already initialized');
    });

    it('name and symbol', async function () {
        let nameV = await vesting.name();
        expect(nameV).to.equal("Vested Eywa");
        expect(await vesting.symbol()).to.equal("vEYWA");
    });

    it('cannot claim before cliff', async function () {
        await expect(vesting.connect(addr1).claim(1)).to.be.revertedWith('reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)');
    });
    
    it('cannot claim who doesnt have tokens', async function () {
        let snapshot0 = await takeSnapshot();
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let timestampBefore = blockBefore.timestamp;
        await increaseTime(day_in_seconds * 51);
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;
        await expect(vesting.connect(signAdmin).claim(1)).to.be.revertedWith('the amount is not available');
        await restoreSnapshot(snapshot0);
    });

    it('claim aftercliff is working', async function () {
        let snapshot0 = await takeSnapshot();
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let timestampBefore = blockBefore.timestamp;
        await increaseTime(day_in_seconds * 51000);
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;
        let balanceBeforeVESTED = await vesting.balanceOf(addr1.address);
        let balanceBeforeRealEYWA = await tokenErc20.balanceOf(addr1.address);
        await vesting.connect(addr1).claim(1);
        let balanceAfterVESTED = await vesting.balanceOf(addr1.address);
        let balanceAfterRealEYWA = await tokenErc20.balanceOf(addr1.address);
        expect(balanceBeforeVESTED).to.equal(5000000);
        expect(balanceAfterVESTED).to.equal(4999999);
        expect(balanceBeforeRealEYWA).to.equal(0);
        expect(balanceAfterRealEYWA).to.equal(1);
        console.log("vestingBalance = ", await tokenErc20.balanceOf(vesting.address));
        expect(await tokenErc20.balanceOf(vesting.address)).to.equal(9999999);
        await restoreSnapshot(snapshot0);
    });
    it('Transfer right after cliff', async function () {
        let snapshot0 = await takeSnapshot();
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let timestampBefore = blockBefore.timestamp;
        await increaseTime(day_in_seconds * 51); // TODO
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;

        console.log("cliff start = ", parseInt(await vesting.connect(addr1).started()) + parseInt(await vesting.connect(addr1).cliffDuration()));
        await vesting.connect(addr1)['transfer(address,uint256)'](addr2.address, 1000000);
        let balanceVestingBefore = await tokenErc20.balanceOf(vesting.address);

        await vesting.connect(addr1).claim(2000000);
        await vesting.connect(addr2).claim(1750000);
        expect(await tokenErc20.balanceOf(addr1.address)).to.equal(2000000);
        expect(await tokenErc20.balanceOf(addr2.address)).to.equal(1750000);
        expect(await vesting.balanceOf(addr1.address)).to.equal(2000000);
        expect(await vesting.balanceOf(addr2.address)).to.equal(1750000);

        expect(await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address)).to.equal(0);
        expect(await vesting.connect(addr2).available(parseInt(timestampBefore), addr2.address)).to.equal(0);

        let balanceVestingAfter = await tokenErc20.balanceOf(vesting.address);
        expect(balanceVestingBefore).to.equal(parseInt(balanceVestingAfter) + 2000000 + 1750000);
        // 
        await increaseTime(day_in_seconds * 10);
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;
        expect(await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address)).to.equal(200000);
        expect(await vesting.connect(addr2).available(parseInt(timestampBefore), addr2.address)).to.equal(175000);
        expect(await vesting.connect(addr3).available(parseInt(timestampBefore), addr3.address)).to.equal(1375000);

        await restoreSnapshot(snapshot0);
    });

    it('can not claim more than available now', async function () {
        let snapshot0 = await takeSnapshot();
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let timestampBefore = blockBefore.timestamp;
        await increaseTime(day_in_seconds * 71);
        await expect(vesting.connect(addr1).claim(3000001)).to.be.revertedWith('the amount is not available');
        await restoreSnapshot(snapshot0);
    });

    it('another linear unlock check', async function () {
        let snapshot0 = await takeSnapshot();
        await increaseTime(day_in_seconds * 51);
        await vesting.connect(addr3).claim(403006);
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let timestampBefore = blockBefore.timestamp;
        let av33 = await vesting.connect(addr3).available(parseInt(timestampBefore), addr3.address);
        let av11 = await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address);
        let summa = parseInt(av33) + parseInt(av11);

        await vesting.connect(addr3)['transfer(address,uint256)'](addr1.address, 7777);
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;
        let av3 = await vesting.connect(addr3).available(parseInt(timestampBefore), addr3.address);
        let av1 = await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address);
        let summa2 = parseInt(av3) + parseInt(av1);
        
        // !!!!!!!!
        // because of with remainder after "div:
        // next sum can be the same or less than previous on 1
        expect(parseInt(summa) - parseInt(summa2)).to.be.lessThan(2);
        
        let av2 = await vesting.connect(addr2).available(parseInt(timestampBefore), addr2.address);
        

        await restoreSnapshot(snapshot0);
    });
});
    
