const fs = require("fs");
let deployInfo = require('../../helper-hardhat-config.json');
const { network } = require("hardhat");


async function main() {
  console.log("\n HUB POOL DEPLOYMENT");
  const [deployer] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Deploying with the account: ${deployer.address}`);
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const CurveProxy = await ethers.getContractFactory('CurveProxy');
  const CurveTokenV2 = await ethers.getContractFactory('CurveTokenV2')
  // const StableSwap2Pool = await ethers.getContractFactory('StableSwap2Pool')
  const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool')
  // const StableSwap4Pool = await ethers.getContractFactory('StableSwap4Pool')
  const StableSwap5Pool = await ethers.getContractFactory('StableSwap5Pool')
  // const StableSwap6Pool = await ethers.getContractFactory('StableSwap6Pool')

  // hub pool params
  const A = 100         // amplification coefficient for the pool.
  const fee = 4000000   // pool swap fee
  const admin_fee = 5000000000

  let hubPoolCoins = []
  let hubPoolCoinsTestnet = []

  if (network.name == "network2" || network.name == "mumbai") {
    // set hub coins
    if (network.name == "network2") {

      for (let i = 0; i < deployInfo[network.name].crosschainPool.length; i++) {
        hubPoolCoins.push(deployInfo[network.name].crosschainPool[i].lp[0].address)
      }
      hubPoolCoins.push(deployInfo[network.name].localPool.lp.address)
    }
    if (network.name == "mumbai") {

      for (let i = 0; i < deployInfo[network.name].crosschainPool.length; i++) {
        hubPoolCoins.push(deployInfo[network.name].crosschainPool[i].lp[0].address)
      }
      hubPoolCoins.push(deployInfo[network.name].localPool.lp.address)
    }

    // deploy LP token
    hubPoolLp = await CurveTokenV2.deploy("Lphub", "LPC", "18", 0)
    await hubPoolLp.deployed()

    // deploy hub pool

    if (network.name == "network2") {
      hubPool = await StableSwap3Pool.deploy(deployer.address, hubPoolCoins, hubPoolLp.address, A, fee, admin_fee)
      await hubPool.deployed()
      await hubPoolLp.set_minter(hubPool.address)
    }

    if (network.name == "mumbai") {
      hubPool = await StableSwap3Pool.deploy(deployer.address, hubPoolCoins, hubPoolLp.address, A, fee, admin_fee)
      await hubPool.deployed()
      await hubPoolLp.set_minter(hubPool.address)
    }

    // setting the hub pool in proxy contract
    await CurveProxy.attach(deployInfo[network.name].curveProxy).setPool(hubPool.address, hubPoolLp.address, hubPoolCoins);

    deployInfo[network.name].hubPool.address = hubPool.address
    deployInfo[network.name].hubPool.lp = hubPoolLp.address
    deployInfo[network.name].hubPool.coins = hubPoolCoins

    // write out the deploy configuration 
    fs.writeFileSync("./helper-hardhat-config.json", JSON.stringify(deployInfo, undefined, 2));
    console.log("Hub pool deployed!");
  }

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
