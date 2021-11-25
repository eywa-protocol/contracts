const fs = require("fs");
const { network } = require("hardhat");
let deployInfo = require('../../helper-hardhat-config.json')

// local pool params
const A = 100                 // amplification coefficient for the pool.
const fee = 4000000           // pool swap fee
const admin_fee = 5000000000
const poolSize = 3


async function main() {
  console.log("\nLOCAL POOL DEPLOYMENT\n");
  const [deployer] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Deploying with the account: ${deployer.address}`);
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);
  console.log("Pool size:", poolSize);
  console.log("Deployment in progress...");

  const ERC20 = await ethers.getContractFactory('SyntERC20')
  const Portal = await ethers.getContractFactory('Portal')
  const Synthesis = await ethers.getContractFactory('Synthesis')
  const CurveProxy = await ethers.getContractFactory('CurveProxy');
  const CurveTokenV2 = await ethers.getContractFactory('CurveTokenV2')
  // const StableSwap2Pool = await ethers.getContractFactory('StableSwap2Pool')
  const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool')
  // const StableSwap4Pool = await ethers.getContractFactory('StableSwap4Pool')
  // const StableSwap5Pool = await ethers.getContractFactory('StableSwap5Pool')
  // const StableSwap6Pool = await ethers.getContractFactory('StableSwap6Pool')


  // deploy curve proxy
  const curveProxy = await CurveProxy.deploy(
    deployInfo[network.name].forwarder,
    deployInfo[network.name].portal,
    deployInfo[network.name].synthesis,
    deployInfo[network.name].bridge
  )
  await curveProxy.deployed()

  // initial proxy setup 
  await Synthesis.attach(deployInfo[network.name].synthesis).setProxyCurve(curveProxy.address);
  await Portal.attach(deployInfo[network.name].portal).setProxyCurve(curveProxy.address);

  deployInfo[network.name].curveProxy = curveProxy.address


  let localToken = []
  let localCoins = []
  let localLp
  let localPool

  // empty the array
  deployInfo[network.name].localToken = []

  // creating local tokens 
  for (let i = 0; i < poolSize; i++) {
    localToken[i] = await ERC20.deploy(network.name + "Token" + i, "TK" + i)
    await localToken[i].deployed()
    localCoins[i] = localToken[i].address
    deployInfo[network.name].localToken.push({ address: localToken[i].address, name: await localToken[i].name(), symbol: await localToken[i].symbol() });
  }

  // deploy the LP token
  localLp = await CurveTokenV2.deploy(network.name + "LpLocal", "LP", "18", 0)
  await localLp.deployed()
  deployInfo[network.name].localPoolLp = { address: localLp.address, name: await localLp.name(), symbol: await localLp.symbol() }

  // deploy a local pool
  switch (poolSize) {
    case 2:
      localPool = await StableSwap2Pool.deploy(deployer.address, localCoins, localLp.address, A, fee, admin_fee)
      break;
    case 3:
      localPool = await StableSwap3Pool.deploy(deployer.address, localCoins, localLp.address, A, fee, admin_fee)
      break;
    case 4:
      localPool = await StableSwap4Pool.deploy(deployer.address, localCoins, localLp.address, A, fee, admin_fee)
      break;
    case 5:
      localPool = await StableSwap5Pool.deploy(deployer.address, localCoins, localLp.address, A, fee, admin_fee)
      break;
    case 6:
      localPool = await StableSwap6Pool.deploy(deployer.address, localCoins, localLp.address, A, fee, admin_fee)
      break;
  }
  await localPool.deployed()
  await localLp.set_minter(localPool.address)

  // setting the pool in proxy contract 
  await CurveProxy.attach(curveProxy.address).setPool(localPool.address, localLp.address, localCoins);

  deployInfo[network.name].localPool = localPool.address
  deployInfo[network.name].localPoolCoins = localCoins

  // write out the deploy configuration 
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
