const { expect } = require('chai')
const { ethers } = require('hardhat');
const { constants, expectEvent, expectRevert, BN } = require('@openzeppelin/test-helpers');
const { parseEvent } = require('typechain');
const { ZERO_ADDRESS } = constants;
const { getAddress } = require('ethers').utils;
const fs = require('fs')


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

let data;
try {
  data = fs.readFileSync('./test/data/unlockScheme.json', 'utf8')
} catch (err) {
  console.error(err)
};

let obj = JSON.parse(data);

let deployer;
let earlyTransferPermissionAdmin;
const TGE_TIME = 1232124124;
const MONTH = 2629743;

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}


describe('Vesting scheme test with randomness', () => {
    let snapshot0;
    let blockNumBefore;
    let blockBefore;
    let timestampBefore;

    let tokenErc20;
    let vesting;
    let adminDeployer;
    let earlyTransferPermissionAdmin;
    let addr1;
    let addr2;
    let addr3;
    let addrs;
    let day_in_seconds = 86400;

    let startTimeStamp;
    let cliffDuration1;
    let cliffAmount1;
    let cliffDuration2;
    let cliffAmount2;
    let cliffDuration3;
    let cliffAmount3;
    let stepDuration;
    let stepAmount;
    let allStepsDuration;
    let numOfSteps;
    
    let permissionlessTimeStamp;
    let vestingSupply;

    let claimAllowanceContract = "0x0000000000000000000000000000000000000000";
    let claimWithAllowanceTimeStamp = 0;

    beforeEach(async () => {
        snapshot0 = await takeSnapshot();
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;
    });
    afterEach(async () => {
        await restoreSnapshot(snapshot0);
    });
    before(async () => {
        const ERC20 = await ethers.getContractFactory('PermitERC20');
        tokenErc20 = await ERC20.deploy("PermitERC20 token", "prmt20t");
        await tokenErc20.deployed();
        [adminDeployer, earlyTransferPermissionAdmin, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

        vestingSupply = 1000000000;
        
        await tokenErc20.mint(adminDeployer.address, vestingSupply, {from: adminDeployer.address});
        expect(await tokenErc20.balanceOf(adminDeployer.address, {from: adminDeployer.address})).to.equal(vestingSupply);
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let timestampBefore = blockBefore.timestamp;
    });

    for (let sale of obj.AllVestingRounds){
        let salePeriod = parseInt(sale.period) * MONTH;
        let this_round_SUPPLY = sale.tokenAmount;
        // let startTimeStamp = TGE_TIME;

        let cliffDuration1 = parseInt(sale.cliffPeriod1) * MONTH;
        let cliffAmount1 = this_round_SUPPLY  * parseInt(sale.cliffPercent1) / 100;

        let cliffDuration2 = parseInt(sale.cliffPeriod2) * MONTH;
        let cliffAmount2 = this_round_SUPPLY  * parseInt(sale.cliffPercent2) / 100;

        let cliffDuration3 = parseInt(sale.cliffPeriod3) * MONTH;
        let cliffAmount3 = this_round_SUPPLY  * parseInt(sale.cliffPercent3) / 100;
        
        let stepDuration = sale.stepAmount;
        let allStepsDuration = salePeriod - cliffDuration1 - cliffDuration2 - cliffDuration3;

        let permissionlessTimeStamp = sale.permissionlessTimeStamp;
        let claimWithAllowanceTimeStamp = sale.claimWithAllowanceTimeStamp;

        let vestingAmount = sale.tokenAmount;


        it('Test of: ' + sale.name, async function () {
            let Vesting = await ethers.getContractFactory('EywaVesting');
            vesting = await Vesting.connect(adminDeployer).deploy(
                tokenErc20.address
            );
            await vesting.deployed();
            await tokenErc20.approve(vesting.address, vestingAmount, {from: adminDeployer.address});
            expect(await tokenErc20.allowance(adminDeployer.address, vesting.address, {from: adminDeployer.address})).to.equal(vestingAmount);
            
            let bal1 = randomIntFromInterval(1, parseInt(vestingAmount) - 2);
            let bal2 = randomIntFromInterval(1, parseInt(vestingAmount) -parseInt(bal1) - 2);
            let bal3 = parseInt(vestingAmount) - bal1 - bal2;

            expect(bal1 + bal2 + bal3).to.equal(parseInt(vestingAmount));

            blockNumBefore = await ethers.provider.getBlockNumber();
            blockBefore = await ethers.provider.getBlock(blockNumBefore);
            timestampBefore = blockBefore.timestamp;
            let startTimeStamp = timestampBefore + 1;


            await vesting.initialize(
                claimAllowanceContract,
                claimWithAllowanceTimeStamp,
                startTimeStamp, 
                {
                    cliffDuration1: cliffDuration1,
                    cliffAmount1: cliffAmount1,
                    cliffDuration2: cliffDuration2,
                    cliffAmount2: cliffAmount2,
                    cliffDuration3: cliffDuration3,
                    cliffAmount3: cliffAmount3,
                },
                stepDuration,
                allStepsDuration,
                permissionlessTimeStamp,
                [addrs[0].address, addrs[1].address, addrs[2].address],
                [bal1, bal2, bal3],
                {from: adminDeployer.address}
            );
            
            async function checkClaimable(timestampBefore)  { 
                blockNumBefore = await ethers.provider.getBlockNumber();
                blockBefore = await ethers.provider.getBlock(blockNumBefore);
                timestampBefore = blockBefore.timestamp;
                let claimableNow = await vesting.claimable(timestampBefore);
                let availableNow = 0;
                for (let i = 0; i < addrs.length; i++) {
                    availableNow = availableNow + parseInt(await vesting.connect(addr1).available(parseInt(timestampBefore), addr1.address));
                }
                expect(parseInt(claimableNow) >= parseInt(availableNow));
            }

            let timeCounter = 0;
            while(timeCounter <= salePeriod + 1) {
                let stepTime = randomIntFromInterval(1, salePeriod  - 2);
                timeCounter = timeCounter + stepTime;
                await increaseTime(stepTime);

                let whatToDo;

                let vaultBalance;
                let randomNumForTransfer;
                let randomAmountForTransfer;

                let randomClaim;
                for (let i = 0; i < addrs.length; i++) {
                    if(parseInt(await vesting.balanceOf(addrs[i].address)) > 0){
                        whatToDo = randomIntFromInterval(1, 3);
                        switch(whatToDo) {
                            case 1:  
                                vaultBalance = await vesting.balanceOf(addrs[i].address);
                                randomNumForTransfer = randomIntFromInterval(0, addrs.length - 1);
                                randomAmountForTransfer = randomIntFromInterval(1, parseInt(vaultBalance));

                                let balanceVestingBefore1 = vaultBalance;
                                let balanceVestingBefore2 = await vesting.balanceOf(addrs[randomNumForTransfer].address);
                                await vesting.connect(addrs[i]).transfer(addrs[randomNumForTransfer].address, randomAmountForTransfer);
                                let balanceVestingAfter1 = await vesting.balanceOf(addrs[i].address);
                                let balanceVestingAfter2 = await vesting.balanceOf(addrs[randomNumForTransfer].address);
                                expect(parseInt(balanceVestingBefore1) - parseInt(balanceVestingAfter1)).to.be.equal(parseInt(balanceVestingAfter2) - parseInt(balanceVestingBefore2));
                                break
                            case 2:  
                                blockNumBefore = await ethers.provider.getBlockNumber();
                                blockBefore = await ethers.provider.getBlock(blockNumBefore);
                                timestampBefore = blockBefore.timestamp;
                                let claimableBalBefore = await vesting.available(parseInt(timestampBefore), addrs[i].address);
                                if (claimableBalBefore == 0){
                                    break;
                                }
                                randomClaim = randomIntFromInterval(1, claimableBalBefore);
                                // await vesting.connect(addrs[i]).claim(parseInt(randomClaim));
                                let balAtClaim = await vesting.balanceOf(addrs[i].address);
                                if (balAtClaim >= randomClaim) {
                                    await vesting.connect(addrs[i]).claim(parseInt(randomClaim));
                                } 
                                blockNumBefore = await ethers.provider.getBlockNumber();
                                blockBefore = await ethers.provider.getBlock(blockNumBefore);
                                timestampBefore = blockBefore.timestamp;
                                await checkClaimable(timestampBefore);
                                let claimableBEFORE = await vesting.claimable(timestampBefore);
                                let claimableBalAfter = await vesting.available(parseInt(timestampBefore), addrs[i].address);
                                blockNumBefore = await ethers.provider.getBlockNumber();
                                blockBefore = await ethers.provider.getBlock(blockNumBefore);
                                timestampBefore = blockBefore.timestamp;
                                let claimableAFTER = await vesting.claimable(timestampBefore);
                                if(claimableAFTER == claimableBEFORE){
                                    expect(parseInt(claimableBalBefore) - randomClaim - parseInt(claimableBalAfter)).to.be.below(2);
                                }
                                await checkClaimable(timestampBefore);
                                break;
                            case 3:
                                break;
                          }
                    }
                }
            }
        });
    }
});