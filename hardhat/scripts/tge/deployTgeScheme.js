const fs = require("fs");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
let unlockScheme = require(process.env.HHC_PASS ? process.env.HHC_PASS : './unlockScheme.json');
const { network } = require("hardhat");

async function main() {
  console.log("\n TGE SCHEME DEPLOYMENT");
  const [deployer] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Account: ${deployer.address}`);
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const Vesting = await ethers.getContractFactory('EywaVesting');
  const EYWA = await ethers.getContractFactory('EywaToken');
  const Treasury = await ethers.getContractFactory('EywaTreasury');

  // const eywa = await EYWA.attach(deployInfo[network.name].dao.eywa)
  const eywa = await EYWA.deploy(deployer.address, "1"/*deployInfo[network.name].chainId*/);
  await eywa.deployed();
  console.log("\nEYWA-Token:", eywa.address);

  let earlyTransferPermissionAdmin;
  const TGE_TIME = (Date.now() + 90000).toString();; // CHANGE!
  const MONTH = 2629743; //unix

  let claimAllowanceContract = "0x0000000000000000000000000000000000000000";

  console.log("\nProcessing vesting scheme...");
  for (let [index, sale] of unlockScheme.allVestingRounds.entries()) {
    console.log(sale.name);

    let salePeriod = sale.period * MONTH;
    let thisRoundSupply = sale.tokenAmount;
    let startTimeStamp = TGE_TIME;
    let cliffDuration1 = sale.cliffPeriod1 * MONTH;
    let cliffAmount1 = thisRoundSupply * sale.cliffPercent1 / 100;
    let cliffDuration2 = sale.cliffPeriod2 * MONTH;
    let cliffAmount2 = thisRoundSupply * sale.cliffPercent2 / 100;
    let cliffDuration3 = sale.cliffPeriod3 * MONTH;
    let cliffAmount3 = thisRoundSupply * sale.cliffPercent3 / 100;
    let allStepsDuration = salePeriod - cliffDuration1 - cliffDuration2 - cliffDuration3;
    let stepDuration = sale.stepAmount;
    let permissionlessTimeStamp = sale.permissionlessTimeStamp;
    let claimWithAllowanceTimeStamp = sale.claimWithAllowanceTimeStamp;

    console.log('deployer balance:', await eywa.balanceOf(deployer.address))
    console.log('thisRoundSupply:', thisRoundSupply)

    console.log("claimAllowanceContract = ", claimAllowanceContract);
    console.log("claimWithAllowanceTimeStamp = ", claimWithAllowanceTimeStamp);
    console.log("startTimeStamp = ", startTimeStamp + startTimeStamp);
    console.log("cliffDuration1 = ", cliffDuration1);
    console.log("cliffAmount1 = ", cliffAmount1);
    console.log("cliffDuration2 = ", cliffDuration1);
    console.log("cliffAmount2 = ", cliffAmount1);
    console.log("cliffDuration3 = ", cliffDuration1);
    console.log("cliffAmount3 = ", cliffAmount1);
    console.log("stepDuration = ", stepDuration);

    console.log("allStepsDuration = ", allStepsDuration);
    console.log("permissionlessTimeStamp = ", permissionlessTimeStamp);

    //deploy Vesting contract
    let vesting = await Vesting.connect(deployer).deploy(eywa.address);
    await vesting.deployed();
    await eywa.connect(deployer).approve(vesting.address, thisRoundSupply);
    await vesting.connect(deployer).initialize(
      claimAllowanceContract,
      claimWithAllowanceTimeStamp,
      startTimeStamp,
      {
        cliffDuration1: cliffDuration1,
        cliffAmount1: ethers.utils.parseEther(cliffAmount1 + ".0"),
        cliffDuration2: cliffDuration2,
        cliffAmount2: ethers.utils.parseEther(cliffAmount2 + ".0"),
        cliffDuration3: cliffDuration3,
        cliffAmount3: ethers.utils.parseEther(cliffAmount3 + ".0"),
      },
      stepDuration,
      allStepsDuration,
      permissionlessTimeStamp,
      [deployer.address],
      [thisRoundSupply],
      { gasLimit: 1_000_000 }
    );
    console.log("Vesting:", vesting.address + "\n");
    unlockScheme.allVestingRounds[index].address = vesting.address;
  }

  //deploy Treasury 
  console.log("Treasury deployment...");
  const treasury = await Treasury.deploy();
  await treasury.deployed()
  let treasuryAmount = 0;
  for (let allocation of unlockScheme.treasuryAllocation) { treasuryAmount += parseInt(allocation.tokenAmount) };
  let tx = await eywa.connect(deployer).transfer(treasury.address, ethers.utils.parseEther(treasuryAmount + ".0"))
  await tx.wait();
  console.log("Treasury address:", treasury.address);
  console.log("EYWA transferred to the treasury: " + treasuryAmount + " Hash: " + tx.hash);
  deployInfo[network.name].dao.treasury = treasury.address;

  //EYWA airdrop
  console.log("\nProcessing airdrop...");
  for (let airdropAllocation of unlockScheme.airdropAllocation) {
    console.log("\n" + airdropAllocation.name);
    for (let allocation of airdropAllocation.allocation) {
      airdropAmount = parseInt(allocation.tokenAmount);
      let tx = await eywa.connect(deployer).transfer(allocation.recipient, ethers.utils.parseEther(airdropAmount + ".0"));
      await tx.wait();
      console.log("EYWA transferred: " + airdropAmount + " Hash: " + tx.hash);
    };
  }

  //check if there is anything left (should be 0)
  console.log("\nDeployer EYWA balance:", await eywa.connect(deployer).balanceOf(deployer.address))

  // write out the deploy configuration
  fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./helper-hardhat-config.json",
    JSON.stringify(deployInfo, undefined, 2));
  fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./scripts/tge/unlockScheme.json",
    JSON.stringify(unlockScheme, undefined, 2));
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
