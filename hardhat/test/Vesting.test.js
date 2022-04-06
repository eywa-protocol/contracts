const { expect } = require('chai')
const { ethers } = require('hardhat');
const { constants, expectEvent, expectRevert, BN } = require('@openzeppelin/test-helpers');
const { parseEvent } = require('typechain');
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


describe('Vesting tests. Part 1', () => {
    let snapshot0;
    let blockNumBefore;
    let blockBefore;
    let timestampBefore;

    let tokenErc20;
    let vesting;
    let adminDeployer;
    let signAdmin;
    let addr1;
    let addr2;
    let addr3;
    let addrs;
    let day_in_seconds = 86400;

    let accForSing = web3.eth.accounts.create();

    let startTimeStamp;
    let cliffDuration;
    let stepDuration;
    let cliffAmount;
    let stepAmount;
    let numOfSteps;
    let signAdminAddress = accForSing.address;
    let signAdminPrKey = accForSing.privateKey;
    
    let signatureTimeStamp;
    let vestingSupply;


    before(async () => {
        const ERC20 = await ethers.getContractFactory('PermitERC20');
        tokenErc20 = await ERC20.deploy("PermitERC20 token", "prmt20t");
        await tokenErc20.deployed();
        [adminDeployer, signAdmin, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();
        const Vesting = await ethers.getContractFactory('EywaVesting');
        vesting = await Vesting.deploy(
            adminDeployer.address,
            tokenErc20.address
        );
        await vesting.deployed();

        vestingSupply = 10000000;
        
        await tokenErc20.mint(adminDeployer.address, vestingSupply, {from: adminDeployer.address});
        expect(await tokenErc20.balanceOf(adminDeployer.address, {from: adminDeployer.address})).to.equal(vestingSupply);
        await tokenErc20.approve(vesting.address, vestingSupply, {from: adminDeployer.address});
        expect(await tokenErc20.allowance(adminDeployer.address, vesting.address, {from: adminDeployer.address})).to.equal(vestingSupply);
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let timestampBefore = blockBefore.timestamp;

        startTimeStamp = timestampBefore + day_in_seconds;
        cliffDuration = day_in_seconds * 50;
        stepDuration = day_in_seconds * 10;
        cliffAmount = vestingSupply / 2;
        numOfSteps = 10;
        stepAmount = (vestingSupply / 2) / numOfSteps;
        signatureTimeStamp = day_in_seconds * 10;

        await vesting.initialize(
            startTimeStamp, 
            cliffDuration,
            stepDuration,
            cliffAmount,
            stepAmount,
            numOfSteps,
            signAdminAddress,
            signatureTimeStamp,
            [addr1.address, addr2.address, addr3.address],
            [vestingSupply / 2, vestingSupply / 4, vestingSupply / 4],
            {from: adminDeployer.address}
        );
        expect(await vesting.cliffAmount()).to.equal(cliffAmount);
        expect(await vesting.stepAmount()).to.equal(stepAmount);
        });
    beforeEach(async () => {
        snapshot0 = await takeSnapshot();
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;
    });
    afterEach(async () => {
        await restoreSnapshot(snapshot0);
    });

    it('cannot be reInitialize', async function () {
        await expect(vesting.initialize(
            startTimeStamp, 
            cliffDuration,
            stepDuration,
            cliffAmount,
            stepAmount,
            numOfSteps,
            signAdminAddress,
            signatureTimeStamp,
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
        await expect(vesting.connect(addr1).claim(1)).to.be.revertedWith('the amount is not available');
    });
    
    it('cannot claim who doesnt have tokens', async function () {
        await increaseTime(day_in_seconds * 51);
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;
        await expect(vesting.connect(signAdmin).claim(1)).to.be.revertedWith('the amount is not available');
    });

    it('claim aftercliff is working', async function () {
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
        expect(await tokenErc20.balanceOf(vesting.address)).to.equal(vestingSupply - 1);
    });
    it('It cannot transfer before signature timestamp', async function () {
        await increaseTime(day_in_seconds * 9); 
        await expect(vesting.connect(addr1).transfer(addr2.address, 1000000)).to.be.revertedWith("It's not signature timestamp yet");
    });
    it('Transfer right after cliff', async function () {
        await increaseTime(parseInt(cliffDuration) + parseInt(day_in_seconds)); 
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;

        await vesting.connect(addr1).transfer(addr2.address, 1000000);
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

        await increaseTime(day_in_seconds * 51); 
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;


    });

    it('Transfer and transfer back', async function () {
        await increaseTime(day_in_seconds * 51); 

        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;
        let availableAddr1before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address);
        let availableAddr2before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr2.address);
        let availableAddr3before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr3.address);
        await vesting.connect(addr1).transfer(addr2.address, 1000000);
        await vesting.connect(addr2).transfer(addr3.address, 50000);

        // await vesting.connect(addr1).claim(117);
        // await increaseTime(day_in_seconds * 20); 
        await vesting.connect(addr2).transfer(addr1.address, 1000000);
        await vesting.connect(addr3).transfer(addr2.address, 50000);
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;
        let availableAddr1after = await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address);
        let availableAddr2after = await vesting.connect(addr1).available(parseInt(timestampBefore), addr2.address);
        let availableAddr3after = await vesting.connect(addr1).available(parseInt(timestampBefore), addr3.address);
        
    });

    it('Finish vesting checks', async function () {
        await increaseTime(day_in_seconds * 51); 

        let claimedAlready = parseInt(0);
        let numberOfTransferOrClaim = parseInt(0);

        let claimable = parseInt(0);
        let sumAvailable = parseInt(0);

        await vesting.connect(addr1).transfer(addr2.address, 1000000);
        await vesting.connect(addr2).transfer(addr3.address, 50000);
        await vesting.connect(addr3).claim(114); // addr 3
        claimedAlready = parseInt(claimedAlready) + parseInt(114);
        numberOfTransferOrClaim = parseInt(numberOfTransferOrClaim) + parseInt(2);

        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore =  blockBefore.timestamp;
        // timestampBefore = timeStampNow();
        let availableAddr1before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address);
        let availableAddr2before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr2.address);
        let availableAddr3before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr3.address);
        expect(parseInt(availableAddr1before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr1.address)));
        expect(parseInt(availableAddr2before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr2.address)));
        expect(parseInt(availableAddr3before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr3.address)));

        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore =  blockBefore.timestamp;
        claimable = await vesting.connect(addr1).claimable(timestampBefore);
        sum = parseInt(availableAddr1before) + parseInt(availableAddr2before) + parseInt(availableAddr3before) + parseInt(claimedAlready);

        expect(parseInt(claimable) - parseInt(sum)).to.be.lessThan(parseInt(numberOfTransferOrClaim));

        await increaseTime(day_in_seconds * 20); 
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore =  blockBefore.timestamp;
        availableAddr1before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address);
        await vesting.connect(addr1).claim(parseInt(availableAddr1before)); //addr 1
        claimedAlready = parseInt(claimedAlready) + parseInt(availableAddr1before);
        await vesting.connect(addr3).transfer(addr1.address, 444);
        numberOfTransferOrClaim = parseInt(numberOfTransferOrClaim) + parseInt(2);

        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore =  blockBefore.timestamp;

        availableAddr1before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address);
        availableAddr2before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr2.address);
        availableAddr3before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr3.address);
        expect(parseInt(availableAddr1before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr1.address)));
        expect(parseInt(availableAddr2before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr2.address)));
        expect(parseInt(availableAddr3before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr3.address)));
        claimable = await vesting.connect(addr1).claimable(timestampBefore);
        sum = parseInt(availableAddr1before) + parseInt(availableAddr2before) + parseInt(availableAddr3before) + parseInt(claimedAlready);
        expect(parseInt(claimable) - parseInt(sum)).to.be.lessThan(parseInt(numberOfTransferOrClaim));
        
        await increaseTime(day_in_seconds * 20); 

        await vesting.connect(addr2).claim(96); //addr 2
        claimedAlready = parseInt(claimedAlready) + parseInt(96);
        await vesting.connect(addr2).transfer(addr4.address, 1151);
        numberOfTransferOrClaim = parseInt(numberOfTransferOrClaim) + parseInt(2);

        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore =  blockBefore.timestamp;

        
        availableAddr1before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address);
        availableAddr2before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr2.address);
        availableAddr3before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr3.address);
        let availableAddr4before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr4.address);
        expect(parseInt(availableAddr1before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr1.address)));
        expect(parseInt(availableAddr2before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr2.address)));
        expect(parseInt(availableAddr3before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr3.address)));
        expect(parseInt(availableAddr4before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr4.address)));
        claimable = await vesting.connect(addr1).claimable(timestampBefore);
        sum = parseInt(availableAddr1before) + parseInt(availableAddr2before) + parseInt(availableAddr3before) + parseInt(availableAddr4before) + parseInt(claimedAlready);
        expect(parseInt(claimable) - parseInt(sum)).to.be.lessThan(parseInt(numberOfTransferOrClaim));

        // final part of vesting
        await increaseTime(day_in_seconds * 60); 
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;

        availableAddr1before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address);
        availableAddr2before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr2.address);
        availableAddr3before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr3.address);
        availableAddr4before = await vesting.connect(addr1).available(parseInt(timestampBefore), addr4.address);
        expect(parseInt(availableAddr1before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr1.address)));
        expect(parseInt(availableAddr2before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr2.address)));
        expect(parseInt(availableAddr3before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr3.address)));
        expect(parseInt(availableAddr4before)).to.be.lessThanOrEqual(parseInt(await vesting.connect(addr1).balanceOf(addr4.address)));
        sum = parseInt(availableAddr1before)+parseInt(availableAddr2before)+parseInt(availableAddr3before) + +parseInt(availableAddr4before) + parseInt(claimedAlready);
        claimable = await vesting.connect(addr1).claimable(parseInt(timestampBefore));
        expect(sum).to.be.equal(claimable);


        await vesting.connect(addr1).claim(availableAddr1before);
        await vesting.connect(addr2).claim(availableAddr2before);
        await vesting.connect(addr3).claim(availableAddr3before);
        await vesting.connect(addr4).claim(availableAddr4before);
        
        let sumEywa = parseInt(0);
        let vestingEywa = await tokenErc20.connect(addr1).balanceOf(vesting.address);
        expect(vestingEywa).to.be.equal(0);
        let addr1Eywa = await tokenErc20.connect(addr1).balanceOf(addr1.address);
        let addr2Eywa = await tokenErc20.connect(addr1).balanceOf(addr2.address);
        let addr3Eywa = await tokenErc20.connect(addr1).balanceOf(addr3.address);
        let addr4Eywa = await tokenErc20.connect(addr1).balanceOf(addr4.address);
        sumEywa = parseInt(addr1Eywa) + parseInt(addr2Eywa) + parseInt(addr3Eywa) + parseInt(addr4Eywa);
        expect(sumEywa).to.be.equal(await vesting.connect(addr1).vEywaInitialSupply());
        
    });



    it('can not claim more than available now', async function () {
        await increaseTime(day_in_seconds * 71);
        await expect(vesting.connect(addr1).claim(3000001)).to.be.revertedWith('the amount is not available');
    });

    it('another linear unlock check', async function () {
        await increaseTime(day_in_seconds * 51);
        await vesting.connect(addr3).claim(403006);
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;
        let av33 = await vesting.connect(addr3).available(parseInt(timestampBefore), addr3.address);
        let av11 = await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address);
        let summa = parseInt(av33) + parseInt(av11);

        await vesting.connect(addr3).transfer(addr1.address, 7777);
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;
        let av3 = await vesting.connect(addr3).available(parseInt(timestampBefore), addr3.address);
        let av1 = await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address);
        let summa2 = parseInt(av3) + parseInt(av1);

        // !!!!!!!!
        // because of with remainder in calculation of claim and transfer:
        // next sum can be the same or less than previous on 2
        expect(parseInt(summa) - parseInt(summa2)).to.be.lessThan(3);
        
        let av2 = await vesting.connect(addr2).available(parseInt(timestampBefore), addr2.address);
        let summaOf3by1stIteration = parseInt(av3) + parseInt(av2) + parseInt(av1);

        await increaseTime(day_in_seconds * 20);
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;
        av3 = await vesting.connect(addr3).available(parseInt(timestampBefore), addr3.address);
        av1 = await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address);
        av2 = await vesting.connect(addr2).available(parseInt(timestampBefore), addr2.address);
        let summaOf3by2ndIteration = parseInt(av3) + parseInt(av2) + parseInt(av1);
                                                                                                
        expect(parseInt(summaOf3by2ndIteration) - parseInt(summaOf3by1stIteration)).to.be.equal(vestingSupply/10);
    });

    it('signature', async function () {
        await increaseTime(day_in_seconds * 1);
        let sender = addr1.address;
        let recepient = addr2.address;
        let nonce = await vesting.connect(addr1).nonces(addr1.address);
        let amount = 9911;

        let msg = web3.utils.soliditySha3(web3.utils.soliditySha3(sender), web3.utils.soliditySha3(recepient), web3.utils.soliditySha3(parseInt(nonce)), web3.utils.soliditySha3(amount));

        let sigObj = web3.eth.accounts.sign(msg, signAdminPrKey);
        let signa = sigObj.signature;
        signature = signa.substr(2);
        let r = '0x' + signature.slice(0, 64);
        let s = '0x' + signature.slice(64, 128);
        let v = '0x' + signature.slice(128, 130);

        let balanceAddr1Before = await vesting.connect(addr1).balanceOf(addr1.address);
        let balanceAddr2Before = await vesting.connect(addr1).balanceOf(addr2.address);

        await vesting.connect(addr1).transferWithSignature(addr2.address, amount, v, r, s);
        let balanceAddr1After = await vesting.connect(addr1).balanceOf(addr1.address);
        let balanceAddr2After = await vesting.connect(addr1).balanceOf(addr2.address);

        expect(balanceAddr2After - balanceAddr2Before).to.be.equal(amount);
        expect(balanceAddr1Before - balanceAddr1After).to.be.equal(amount);
    });

    it('signature wrong', async function () {
        await increaseTime(day_in_seconds * 1);
        let sender = addr1.address;
        let recepient = addr2.address;
        let nonce = await vesting.connect(addr1).nonces(addr1.address);
        let amount = 9911;

        let msg = web3.utils.soliditySha3(web3.utils.soliditySha3(sender), web3.utils.soliditySha3(recepient), web3.utils.soliditySha3(parseInt(nonce)), web3.utils.soliditySha3(amount));

        let sigObj = web3.eth.accounts.sign(msg, signAdminPrKey);
        let signa = sigObj.signature;
        signature = signa.substr(2);
        let r = '0x' + signature.slice(0, 64);
        let s = '0x' + signature.slice(64, 128);
        let v = '0x' + signature.slice(128, 130);

        let fakeR = '0x468dc65fc3d1f1b1e283392c2ef3da995279f36e940c31ce1319b2d47f8e98c6';

        await expect(vesting.connect(addr1).transferWithSignature(addr2.address, amount, v, fakeR, s)).to.be.revertedWith('ERROR: Verifying signature failed');
    });

    it('Wrong signature suppose to not work', async function () {
        await increaseTime(day_in_seconds * 1);
        let sender = addr1.address;
        let recepient = addr2.address;
        let nonce = await vesting.connect(addr1).nonces(addr1.address);
        let amount = 9911;

        let msg = web3.utils.soliditySha3(web3.utils.soliditySha3(sender), web3.utils.soliditySha3(recepient), web3.utils.soliditySha3(parseInt(nonce)), web3.utils.soliditySha3(amount));

        let sigObj = web3.eth.accounts.sign(msg, signAdminPrKey);
        let signa = sigObj.signature;
        signature = signa.substr(2);
        let r = '0x' + signature.slice(0, 64);
        let s = '0x' + signature.slice(64, 128);
        let v = '0x' + signature.slice(128, 130);

        let fakeR = '0x468dc65fc3d1f1b1e283392c2ef3da995279f36e940c31ce1319b2d47f8e98c6';

        await expect(vesting.connect(addr1).transferWithSignature(addr2.address, amount, v, fakeR, s)).to.be.revertedWith('ERROR: Verifying signature failed');
    });

    it('signature transferFrom', async function () {
        await increaseTime(day_in_seconds * 1);
        let sender = addr1.address;
        let recepient = addr2.address;
        let nonce = await vesting.connect(addr1).nonces(addr1.address);
        let amount = 9911;

        let msg = web3.utils.soliditySha3(web3.utils.soliditySha3(sender), web3.utils.soliditySha3(recepient), web3.utils.soliditySha3(parseInt(nonce)), web3.utils.soliditySha3(amount));

        let sigObj = web3.eth.accounts.sign(msg, signAdminPrKey);
        let signa = sigObj.signature;
        signature = signa.substr(2);
        let r = '0x' + signature.slice(0, 64);
        let s = '0x' + signature.slice(64, 128);
        let v = '0x' + signature.slice(128, 130);

        let balanceAddr1Before = await vesting.connect(addr1).balanceOf(addr1.address);
        let balanceAddr2Before = await vesting.connect(addr1).balanceOf(addr2.address);
        await vesting.connect(addr1).approve(addr3.address,amount);
        await vesting.connect(addr3).transferFromWithSignature(addr1.address, addr2.address, amount, v, r, s);
        let balanceAddr1After = await vesting.connect(addr1).balanceOf(addr1.address);
        let balanceAddr2After = await vesting.connect(addr1).balanceOf(addr2.address);

        expect(balanceAddr2After - balanceAddr2Before).to.be.equal(amount);
        expect(balanceAddr1Before - balanceAddr1After).to.be.equal(amount);
    });

    // it('Cloning', async function () {
    //     let clonedAddress = await vesting.connect(adminDeployer).clone();
    //     console.log("adminDeployer = ", adminDeployer.address);
    //     console.log("vesting = ", vesting.address);
    //     console.log("clonedAddress = ", clonedAddress);

    //     console.log("nv = ", await vesting.connect(adminDeployer).nV());

    //     const newVesting = getContractAt(abi, await vesting.connect(adminDeployer).nV());
    // });
});
    
describe('Vesting tests. Part 2', () => {
    let snapshot0;
    let blockNumBefore;
    let blockBefore;
    let timestampBefore;

    let tokenErc20;
    let vesting;
    let adminDeployer;
    let signAdmin;
    let addr1;
    let addr2;
    let addr3;
    let addrs;
    let day_in_seconds = 86400;

    let accForSing = web3.eth.accounts.create();

    let startTimeStamp;
    let cliffDuration;
    let stepDuration;
    let cliffAmount;
    let stepAmount;
    let numOfSteps;
    let signAdminAddress = accForSing.address;
    let signAdminPrKey = accForSing.privateKey;
    
    let signatureTimeStamp;
    let vestingSupply;

    it('Only adminDeployer can call initialize', async function () {
        const ERC20 = await ethers.getContractFactory('PermitERC20');
        tokenErc20 = await ERC20.deploy("PermitERC20 token", "prmt20t");
        await tokenErc20.deployed();
        [adminDeployer, signAdmin, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();
        const Vesting = await ethers.getContractFactory('EywaVesting');
        vesting = await Vesting.deploy(
            adminDeployer.address,
            tokenErc20.address
        );
        await vesting.deployed();

        vestingSupply = 10000000;
        
        await tokenErc20.mint(adminDeployer.address, vestingSupply, {from: adminDeployer.address});
        expect(await tokenErc20.balanceOf(adminDeployer.address, {from: adminDeployer.address})).to.equal(vestingSupply);
        await tokenErc20.approve(vesting.address, vestingSupply, {from: adminDeployer.address});
        expect(await tokenErc20.allowance(adminDeployer.address, vesting.address, {from: adminDeployer.address})).to.equal(vestingSupply);
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let timestampBefore = blockBefore.timestamp;

        console.log("erc20permint balance of vesting = ", await tokenErc20.balanceOf(vesting.address));


        startTimeStamp = timestampBefore + day_in_seconds;
        cliffDuration = day_in_seconds * 50;
        stepDuration = day_in_seconds * 10;
        cliffAmount = vestingSupply / 2;
        numOfSteps = 10;
        stepAmount = (vestingSupply / 2) / numOfSteps;
        signatureTimeStamp = day_in_seconds * 10;

        await expect(vesting.connect(addr2).initialize(
            startTimeStamp, 
            cliffDuration,
            stepDuration,
            cliffAmount,
            stepAmount,
            numOfSteps,
            signAdminAddress,
            signatureTimeStamp,
            [addr1.address, addr2.address, addr3.address],
            [vestingSupply / 2, vestingSupply / 4, vestingSupply / 4]        
        )).to.be.revertedWith("Msg.sender is not admin");
    });
        
});