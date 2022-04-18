const fs = require("fs");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
let unlockScheme = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../unlockScheme.json');
const { network } = require("hardhat");

async function main() {
  console.log("\n VESTING DEPLOYMENT");
  const [deployer] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Account: ${deployer.address}`);
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const getPercent = (percentToGet, number) => { (percentToGet / 100) * number };

  const Vesting = await ethers.getContractFactory('Vesting');
  const EYWA = await ethers.getContractFactory('EYWA');


  const EYWA_TOTAL_SUPPLY = 1_000_000_000;
  const TGE_TIME = 1232124124;
  const MONTH = 4000000;

  //deploy EYWA token
  const eywa = await EYWA.deploy();

  //proceed scheme
  for (let sale of unlockScheme) {
    const vesting = await Vesting.deploy(
      sale.name,
      deployer.address,
      eywa.address
    );

    const startTimeStamp = TGE_TIME;
    const cliffDuration = sale.cliffPeriod * MONTH;
    const stepDuration = "1"; //seconds
    const numOfSteps = (sale.period * MONTH - cliffDuration) / stepDuration; //!!must be even
    const cliffAmount = getPercent(sale.cliffPercent, sale.tokenAmount); //!!must be even
    const stepAmount = (sale.tokenAmount - cliffAmount) / numOfSteps; //!!must be even
    const permissionlessTimeStamp = "0";

    await vesting.initialize(
      startTimeStamp,
      cliffDuration,
      stepDuration,
      cliffAmount,
      stepAmount,
      numOfSteps,
      deployer.address,
      permissionlessTimeStamp,
      [],
      [],
      { from: deployer.address }
    );
  }

















  let hubPoolCoins = [];
  let hubPoolCoinsTestnet = [];

  if (network.name == "network2" || network.name == "mumbai") {
    // set hub coins
    if (network.name == "network2") {

      for (let i = 0; i < deployInfo[network.name].crosschainPool.length; i++) {
        hubPoolCoins.push(deployInfo[network.name].crosschainPool[i].lp[0].address);
      }
      hubPoolCoins.push(deployInfo[network.name].localPool.lp.address);
    }
    if (network.name == "mumbai") {

      for (let i = 0; i < deployInfo[network.name].crosschainPool.length; i++) {
        hubPoolCoins.push(deployInfo[network.name].crosschainPool[i].lp[0].address);
      }
      hubPoolCoins.push(deployInfo[network.name].localPool.lp.address);
    }

    // deploy LP token
    let hubPoolLp = await LpToken.deploy("Lphub", "LPC");
    await hubPoolLp.deployed();
    await hubPoolLp.deployTransaction.wait();

    // deploy hub pool
    let hubPool;
    if (network.name == "network2") {
      hubPool = await StableSwap3Pool.deploy(deployer.address, hubPoolCoins, hubPoolLp.address, A, fee, admin_fee);
      await hubPool.deployed();
      await hubPool.deployTransaction.wait();
      let tx_ = await hubPoolLp.set_minter(hubPool.address);
      await tx_.wait();
    }

    if (network.name == "mumbai") {
      hubPool = await StableSwap3Pool.deploy(deployer.address, hubPoolCoins, hubPoolLp.address, A, fee, admin_fee);
      await hubPool.deployed();
      await hubPool.deployTransaction.wait();
      let tx_ = await hubPoolLp.set_minter(hubPool.address);
      await tx_.wait();
    }

    // setting the hub pool in proxy contract
    let curveProxyInstance = await CurveProxy.attach(deployInfo[network.name].curveProxy);
    let tx_ = await curveProxyInstance.setPool(hubPool.address, hubPoolLp.address, hubPoolCoins);
    await tx_.wait();

    deployInfo[network.name].hubPool.address = hubPool.address;
    deployInfo[network.name].hubPool.lp = hubPoolLp.address;
    deployInfo[network.name].hubPool.coins = hubPoolCoins;

    // write out the deploy configuration
    fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./helper-hardhat-config.json",
      JSON.stringify(deployInfo, undefined, 2));
    console.log("Hub pool deployed!");
  }

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
