const fs = require("fs");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { network } = require("hardhat");

async function main() {
  console.log("\n HUB POOL DEPLOYMENT");
  const [deployer] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Account: ${deployer.address}`);
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const CurveProxy = await ethers.getContractFactory('CurveProxy');
  const LpToken = await ethers.getContractFactory('CurveTokenV5');
  // const StableSwap2Pool = await ethers.getContractFactory('StableSwap2Pool');
  const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool');
  // const StableSwap4Pool = await ethers.getContractFactory('StableSwap4Pool');
  const StableSwap5Pool = await ethers.getContractFactory('StableSwap5Pool');
  // const StableSwap6Pool = await ethers.getContractFactory('StableSwap6Pool');

  // hub pool params
  const A = 100    ;     // amplification coefficient for the pool.
  const fee = 4000000 ;  // pool swap fee
  const admin_fee = 5000000000;

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
