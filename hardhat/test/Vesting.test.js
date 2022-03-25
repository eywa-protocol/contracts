const { expect } = require('chai')
const ethers = require('hardhat');
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
        tokenErc20 = await ERC20.deploy();
        await tokenErc20.deployed();
        
        [adminDeployer, signAdmin, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();


        const Vesting = await ethers.getContractFactory('EywaVesting');
        vesting = await Vesting.deploy(
            adminDeployer
        );
        await vesting.deployed();
      });
    
      beforeEach("initialization", function () {
        it("Balance of adminDeployer should be equal to the number", async function () {
            await tokenErc20.mint(adminDeployer.address, 10000000, {from: adminDeployer});
            expect(await tokenErc20.balanceOf(adminDeployer.address, {from: adminDeployer})).to.equal(10000000);
        });
        it("Vesting contract should have approve to Transfer", async function () {
            await tokenErc20.approve(vesting.address, 10000000, {from: adminDeployer});
            expect(await tokenErc20.allowance(adminDeployer.address, vesting.address, {from: adminDeployer})).to.equal(10000000);
        });
        it("Initialization function", async function () {
            let timestampBefore = blockBefore.timestamp;
            let started = timestampBefore ;
            console.log("timestampBefore = ", timestampBefore);

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
                [addr1, addr2, addr3],
                [10000000 / 2, 10000000 / 4, 10000000 / 4],
                {from: adminDeployer}
            );
            expect(await vesting.cliffAmount).to.equal(10000000 / 2);
            expect(await vesting.stepAmount).to.equal((10000000 / 2)/10);
        });

    });
    

});