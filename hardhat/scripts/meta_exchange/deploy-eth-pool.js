const fs = require("fs");
const { network } = require("hardhat");
const hre = require("hardhat");
const env = require('dotenv').config({ path: './.env' })
let deployInfo = require('../../helper-hardhat-config.json')


const A = 100                 // amplification coefficient for the pool.
const fee = 4000000           // pool swap fee
const admin_fee = 5000000000
const poolSize = 3

async function main() {
  console.log("\nETH POOL DEPLOYMENT\n");
  const [deployer] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Deploying with the account: ${deployer.address}`);
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);
  console.log("Pool size:", poolSize);
  console.log("Deployment in progress...");

  const ERC20 = await ethers.getContractFactory('SyntERC20')
  const Bridge = await ethers.getContractFactory('Bridge')
  const Portal = await ethers.getContractFactory('Portal')
  const Synthesis = await ethers.getContractFactory('Synthesis')
  const CurveProxy = await ethers.getContractFactory('CurveProxy');
  const CurveTokenV2 = await ethers.getContractFactory('CurveTokenV2')
  // const StableSwap2Pool = await ethers.getContractFactory('StableSwap2Pool')
  const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool')
  // const StableSwap4Pool = await ethers.getContractFactory('StableSwap4Pool')
  // const StableSwap5Pool = await ethers.getContractFactory('StableSwap5Pool')
  // const StableSwap6Pool = await ethers.getContractFactory('StableSwap6Pool')



  let ethToken = []
  let ethPoolCoins = []
  let ethPoolLp
  let ethPool

  //empty the array
  // deployInfo[network.name].localToken = []

  if(network.name == "network1" || network.name == "rinkeby" ){
    for (let i = 0; i < poolSize; i++) {
      localToken[i] = await ERC20.deploy(network.name+"TokenETH"+i,"TKETH"+i)
      await localToken[i].deployed()
      // ethToken[i] = localToken[i].address
      deployInfo[network.name].ethToken.push({address: localToken[i].address, name: await localToken[i].name(), symbol: await localToken[i].symbol()});
      ethPoolCoins.push(await getRepresentation(deployInfo[network.name].ethToken[i] , deployInfo["mumbai"].synthesis))
    }

  }

  if(network.name == "network2" || network.name == "mumbai" ){

  ethPoolLp = await CurveTokenV2.deploy(network.name+"LpPoolETH", "LPETH", "18", 0)
  await ethPoolLp.deployed()
  deployInfo[network.name].ethPoolLp = {address: ethPoolLp.address, name: await ethPoolLp.name(), symbol: await ethPoolLp.symbol()}


  switch (poolSize) {
    case 2:
      ethPool = await StableSwap2Pool.deploy(deployer.address, ethPoolCoins, ethPoolLp.address, A, fee, admin_fee)
      break;
    case 3:
      ethPool = await StableSwap3Pool.deploy(deployer.address, ethPoolCoins, ethPoolLp.address, A, fee, admin_fee)
      break;
    case 4:
      ethPool = await StableSwap4Pool.deploy(deployer.address, ethPoolCoins, ethPoolLp.address, A, fee, admin_fee)
      break;
    case 5:
      ethPool = await StableSwap5Pool.deploy(deployer.address, ethPoolCoins, ethPoolLp.address, A, fee, admin_fee)
      break;
    case 6:
      ethPool = await StableSwap6Pool.deploy(deployer.address, ethPoolCoins, ethPoolLp.address, A, fee, admin_fee)
      break;
  }
  await ethPool.deployed()
  await ethPoolLp.set_minter(ethPool.address)

  // setting the pool
  await CurveProxy.attach(deployInfo[network.name].curveProxy).setPool(ethPool.address, ethPoolLp.address, ethPoolCoins);

  deployInfo[network.name].ethPool = ethPool.address
  deployInfo[network.name].ethPoolCoins = ethPoolCoins
}


  console.log("_______________________________________");
  fs.writeFileSync("./helper-hardhat-config.json", JSON.stringify(deployInfo, undefined, 2));
  console.log("Local Pool Deployed! (saved)\n");



}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
