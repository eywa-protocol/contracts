const fs = require("fs");
// const hre = require("hardhat");
const { getRepresentation } = require("../../utils/helper");
let deployInfo = require('../../helper-hardhat-config.json');
const { network } = require("hardhat");



async function main() {
  console.log("\n CROSSCHAIN POOL DEPLOYMENT");
  const [deployer] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Deploying with the account: ${deployer.address}`);
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const ERC20 = await ethers.getContractFactory('ERC20Mock')
  const Bridge = await ethers.getContractFactory('Bridge')
  const Portal = await ethers.getContractFactory('Portal')
  const Synthesis = await ethers.getContractFactory('Synthesis')
  const CurveProxy = await ethers.getContractFactory('CurveProxy');
  const CurveTokenV2 = await ethers.getContractFactory('CurveTokenV2')
  const StableSwap2Pool = await ethers.getContractFactory('StableSwap2Pool')
  const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool')
  const StableSwap4Pool = await ethers.getContractFactory('StableSwap4Pool')
  const StableSwap5Pool = await ethers.getContractFactory('StableSwap5Pool')
  const StableSwap6Pool = await ethers.getContractFactory('StableSwap6Pool')

  // crosschain pool params
  const A = 100         // amplification coefficient for the pool.
  const fee = 4000000   // pool swap fee
  const admin_fee = 5000000000

  let crosschainCoins = []
  let crosschainCoinsTestnet = []

  if (network.name == "network2" || network.name == "mumbai") {
    // set crosschain coins
    if (network.name == "network2") {

      for (let i = 0; i < deployInfo[network.name].ethPool.length; i++) {
        crosschainCoins.push(deployInfo[network.name].ethPool[i].lp[0].address)
      }
    }
    if (network.name == "mumbai") {

      for (let i = 0; i < deployInfo[network.name].ethPool.length; i++) {
        crosschainCoins.push(deployInfo[network.name].ethPool[i].lp[0].address)
      }
    }

    // deploy LP token
    crosschainLp = await CurveTokenV2.deploy("LpCrosschain", "LPC", "18", 0)
    await crosschainLp.deployed()

    // deploy crosschain pool

    if (network.name == "network2") {
      crosschainPool = await StableSwap2Pool.deploy(deployer.address, crosschainCoins, crosschainLp.address, A, fee, admin_fee)
      await crosschainPool.deployed()
      await crosschainLp.set_minter(crosschainPool.address)
    }

    if (network.name == "mumbai") {
      crosschainPool = await StableSwap5Pool.deploy(deployer.address, crosschainCoinsTestnet, crosschainLp.address, A, fee, admin_fee)
      await crosschainPool.deployed()
      await crosschainLp.set_minter(crosschainPool.address)
    }


    // setting the crosschain pool in proxy contract
    await CurveProxy.attach(deployInfo[network.name].curveProxy).setPool(crosschainPool.address, crosschainLp.address, crosschainCoins);

    deployInfo[network.name].crosschainPool = crosschainPool.address
    deployInfo[network.name].crosschainPoolLp = crosschainLp.address
    deployInfo[network.name].crosschainPoolCoins = crosschainCoins

    // write out the deploy configuration 
    console.log("_______________________________________");
    fs.writeFileSync("./helper-hardhat-config.json", JSON.stringify(deployInfo, undefined, 2));
    console.log("Crosschain pool deployed!");
  }

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
