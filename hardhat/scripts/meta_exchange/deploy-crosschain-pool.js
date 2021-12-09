const fs = require("fs");
// const hre = require("hardhat");
const { getRepresentation } = require("../../utils/helper");
let deployInfo = require('../../helper-hardhat-config.json');
const { network } = require("hardhat");



async function main() {
  console.log("\nCROSSCHAIN POOL DEPLOYMENT\n");
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
  for (const netw in deployInfo) {
    if( Object.keys(deployInfo[netw].localPoolLp).length !== 0){
      if (netw === "network1" || netw === "network2" || netw === "network3") {
        if (netw != network.name) {
          crosschainCoins.push(await getRepresentation(deployInfo[netw].localPoolLp, deployInfo[network.name].synthesis))
        } else {
          crosschainCoins.push(deployInfo[netw].localPoolLp.address)
        }
      }

      if (netw === "avalanchetestnet" || netw === "rinkeby" || netw === "hecotestnet" || netw === "mumbai" || netw === "bsctestnet" ) {
        if (netw != network.name) {
          crosschainCoinsTestnet.push(await getRepresentation(deployInfo[netw].localPoolLp, deployInfo[network.name].synthesis))
        } else {
          crosschainCoinsTestnet.push(deployInfo[netw].localPoolLp.address)
        }
      }
    }
  }


  // deploy LP token
  crosschainLp = await CurveTokenV2.deploy("LpCrosschain", "LPC", "18", 0)
  await crosschainLp.deployed()

  // deploy crosschain pool
if (network.name === "network1" || network.name === "network2" || network.name === "network3") {
  if (network.name == "network2") {
    crosschainCoins.push(deployInfo[network.name].ethPoolLp.address)
    crosschainPool = await StableSwap4Pool.deploy(deployer.address, crosschainCoins, crosschainLp.address, A, fee, admin_fee)
    await crosschainPool.deployed()
    await crosschainLp.set_minter(crosschainPool.address)
  } else{
    crosschainPool = await StableSwap3Pool.deploy(deployer.address, crosschainCoins, crosschainLp.address, A, fee, admin_fee)
    await crosschainPool.deployed()
    await crosschainLp.set_minter(crosschainPool.address)
  }
}

if (network.name === "avalanchetestnet" || network.name === "rinkeby" || network.name === "hecotestnet" || network.name === "mumbai" || network.name === "bsctestnet" ) {
  if (network.name == "mumbai") {
    // deploy crosschain pool
    crosschainCoinsTestnet.push(deployInfo[network.name].ethPoolLp.address)
    crosschainPool = await StableSwap6Pool.deploy(deployer.address, crosschainCoinsTestnet, crosschainLp.address, A, fee, admin_fee)
    await crosschainPool.deployed()
    await crosschainLp.set_minter(crosschainPool.address)
  }else{
    crosschainPool = await StableSwap5Pool.deploy(deployer.address, crosschainCoinsTestnet, crosschainLp.address, A, fee, admin_fee)
    await crosschainPool.deployed()
    await crosschainLp.set_minter(crosschainPool.address)
  }
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

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
