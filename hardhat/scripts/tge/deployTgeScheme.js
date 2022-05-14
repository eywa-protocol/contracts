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

  const getPercent = (percentToGet, number) => { (percentToGet / 100) * number };

  const Vesting = await ethers.getContractFactory('EywaVesting');
  const EYWA = await ethers.getContractFactory('EywaToken');
  const Treasury = await ethers.getContractFactory('EywaTreasury');

  const eywa = await EYWA.attach(deployInfo[network.name].dao.eywa)

  let earlyTransferPermissionAdmin;
  const TGE_TIME = 1232124124; // CHANGE!
  const MONTH = 2629743;

  let claimAllowanceContract = "0x0000000000000000000000000000000000000000";


  for (let [index, sale] of unlockScheme.allVestingRounds.entries()) {
    console.log(sale.name);

    let salePeriod = sale.period * MONTH;
    let thisRoundSupply = ethers.utils.parseEther(sale.tokenAmount + ".0");
    let startTimeStamp = TGE_TIME;
    let cliffDuration = sale.cliffPeriod * MONTH;
    let cliffAmount = parseInt(thisRoundSupply * sale.cliffPercent / 100);
    let stepDuration = sale.stepAmount;
    let allStepsDuration = salePeriod - cliffDuration;
    let permissionlessTimeStamp = sale.permissionlessTimeStamp;
    let claimWithAllowanceTimeStamp = sale.claimWithAllowanceTimeStamp;
    console.log('deployer balance:', await eywa.balanceOf(deployer.address))
    console.log('thisRoundSupply:', thisRoundSupply)

    console.log("claimAllowanceContract = ", claimAllowanceContract);
    console.log("claimWithAllowanceTimeStamp = ", claimWithAllowanceTimeStamp);
    console.log("startTimeStamp = ", startTimeStamp + startTimeStamp);
    console.log("cliffDuration = ", cliffDuration);
    console.log("cliffTime = ", cliffDuration);
    console.log("stepDuration = ", stepDuration);
    console.log("cliffAmount = ", cliffAmount);
    console.log("allStepsDuration = ", allStepsDuration);
    console.log("permissionlessTimeStamp = ", permissionlessTimeStamp);

    // deploy contract
    let vesting = await Vesting.connect(deployer).deploy(eywa.address);
    await vesting.deployed();
    await eywa.connect(deployer).approve(vesting.address, thisRoundSupply);
    await vesting.connect(deployer).initialize(
      claimAllowanceContract,
      claimWithAllowanceTimeStamp,
      startTimeStamp,
      cliffDuration,
      stepDuration,
      cliffAmount,
      allStepsDuration,
      permissionlessTimeStamp,
      [deployer.address],
      [thisRoundSupply]
    );
    console.log("Vesting:", vesting.address + "\n");
    unlockScheme.allVestingRounds[index].address = vesting.address;
  }

  //deploy Treasury 
  console.log("Treasury deployment");
  const treasury = await Treasury.deploy();
  await treasury.deployed()
  let treasuryAmount = 0;
  for (let allocation of unlockScheme.treasuryAllocation) { treasuryAmount += parseInt(allocation.tokenAmount) };
  let tx = await eywa.connect(deployer).transfer(treasury.address, ethers.utils.parseEther(treasuryAmount + ".0"))
  console.log("Treasury address:", treasury.address + "\n");
  console.log("EYWA transferred to the treasury:", treasuryAmount);
  deployInfo[network.name].dao.treasury = treasury.address;

  //airdrop
  console.log("Processing airdrop");
  for (let airdropAllocation of unlockScheme.airdropAllocation) {
    for (let allocation of airdropAllocation) {
      console.log(allocation.name);
      airdropAmount = parseInt(allocation.tokenAmount);
      let tx = await eywa.connect(deployer).transfer(allocation.recipient, ethers.utils.parseEther(airdropAmount + ".0"));
      await tx.wait();
      console.log("EYWA transferred:", tx.hash);
    };
  }
  
  // write out the deploy configuration
  fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./helper-hardhat-config.json",
    JSON.stringify(deployInfo, undefined, 2));
  // fs.writeFileSync("./unlockScheme.json", JSON.stringify(unlockScheme, undefined, 2));
  fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./scripts/tge/unlockScheme.json",
    JSON.stringify(unlockScheme, undefined, 2));

  // console.log(unlockScheme)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
