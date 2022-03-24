const fs = require("fs");
const { network } = require("hardhat");
const { getRepresentation } = require("../../utils/helper");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')

// crosschain pool params
const A = 100                 // amplification coefficient for the pool.
const fee = 4000000           // pool swap fee
const admin_fee = 5000000000
const poolSize = 3

async function main() {
  console.log("\n CROSSCHAIN POOL DEPLOYMENT");
  const [deployer] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Account: ${deployer.address}`);
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);
  console.log("Pool size:", poolSize);
  console.log("Deployment in progress...");

  const ERC20 = await ethers.getContractFactory('PermitERC20')
  const Portal = await ethers.getContractFactory('Portal')
  const Synthesis = await ethers.getContractFactory('Synthesis')
  const CurveProxy = await ethers.getContractFactory('CurveProxy');
  const LpToken = await ethers.getContractFactory('CurveTokenV5')
  // const StableSwap2Pool = await ethers.getContractFactory('StableSwap2Pool')
  const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool')
  // const StableSwap4Pool = await ethers.getContractFactory('StableSwap4Pool')
  // const StableSwap5Pool = await ethers.getContractFactory('StableSwap5Pool')
  // const StableSwap6Pool = await ethers.getContractFactory('StableSwap6Pool')


  // deploy Curve Proxy
  const curveProxy = await upgrades.deployProxy(CurveProxy, [
    deployInfo[network.name].forwarder,
    deployInfo[network.name].portal,
    deployInfo[network.name].synthesis,
    deployInfo[network.name].bridge
  ], { initializer: 'initialize' });
  await curveProxy.deployed()

  // initial proxy setup
  await Synthesis.attach(deployInfo[network.name].synthesis).setProxyCurve(curveProxy.address);
  await Portal.attach(deployInfo[network.name].portal).setProxyCurve(curveProxy.address);

  deployInfo[network.name].curveProxy = curveProxy.address



  let localToken = []
  let crosschainPoolCoins = []
  let crosschainPoolLp
  let crosschainPool
  let bulevo = false;
  // creating local stable tokens for specified networks
  if (network.name == "rinkeby" || network.name == "bsctestnet" || network.name == "mumbai") bulevo = true;
  if (network.name.includes("network")) bulevo = true;
  
  if (bulevo) {    
    //empty the array
    deployInfo[network.name].localToken = [];

    for (let i = 0; i < poolSize; i++) {
      localToken[i] = await ERC20.deploy(network.name + "TokenStable" + i, "TKS" + i)
      await localToken[i].deployed();
      deployInfo[network.name].localToken.push({ address: localToken[i].address, name: await localToken[i].name(), symbol: await localToken[i].symbol() });
      if (network.name == "network1" || network.name == "network3")
      //TODO (realToken, decimals, chainId, netwiker, synthesisAddress)
        crosschainPoolCoins.push(await getRepresentation(deployInfo[network.name].localToken[i], "18",  deployInfo[network.name].chainId, deployInfo[network.name].netwiker, deployInfo["network2"].synthesis));
      if (network.name == "rinkeby" || network.name == "bsctestnet" || network.name == "rinkeby" || network.name == "rinkeby" || network.name == "rinkeby")
      //TODO
        crosschainPoolCoins.push(await getRepresentation(deployInfo[network.name].localToken[i], "18",  deployInfo[network.name].chainId, deployInfo[network.name].netwiker, deployInfo["mumbai"].synthesis));
    }
    if (network.name == "network1" || network.name == "network3")
      deployInfo["network2"].crosschainPool.push({ network: network.name, address: "", coins: crosschainPoolCoins, lp: [] });
    if (network.name == "rinkeby" || network.name == "bsctestnet" || network.name == "rinkeby" || network.name == "rinkeby" || network.name == "rinkeby")
      deployInfo["mumbai"].crosschainPool.push({ network: network.name, address: "", coins: crosschainPoolCoins, lp: [] });

 }

  // creating crosschain pool for specified networks
  if (network.name == "network2" || network.name == "mumbai") {
    // deploy LP token
    for (let i = 0; i < deployInfo[network.name].crosschainPool.length; i++) {

      let net = deployInfo[network.name].crosschainPool[i].network;

      crosschainPoolLp = await LpToken.deploy(net + "LpPoolCrosschain", "LPC");
      await crosschainPoolLp.deployed();
      deployInfo[network.name].crosschainPool[i].lp.push({ address: crosschainPoolLp.address, name: await crosschainPoolLp.name(), symbol: await crosschainPoolLp.symbol() });

      // deploy crosschain pool
      switch (poolSize) {
        case 2:
          crosschainPool = await StableSwap2Pool.deploy(deployer.address, deployInfo[network.name].crosschainPool[i].coins, crosschainPoolLp.address, A, fee, admin_fee);
          break;
        case 3:
          crosschainPool = await StableSwap3Pool.deploy(deployer.address, deployInfo[network.name].crosschainPool[i].coins, crosschainPoolLp.address, A, fee, admin_fee);
          break;
        case 4:
          crosschainPool = await StableSwap4Pool.deploy(deployer.address, deployInfo[network.name].crosschainPool[i].coins, crosschainPoolLp.address, A, fee, admin_fee);
          break;
        case 5:
          crosschainPool = await StableSwap5Pool.deploy(deployer.address, deployInfo[network.name].crosschainPool[i].coins, crosschainPoolLp.address, A, fee, admin_fee);
          break;
        case 6:
          crosschainPool = await StableSwap6Pool.deploy(deployer.address, deployInfo[network.name].crosschainPool[i].coins, crosschainPoolLp.address, A, fee, admin_fee);
          break;
      }
      await crosschainPool.deployed();
      await crosschainPoolLp.set_minter(crosschainPool.address);

      // setting the crosschain pool in proxy contract
      await CurveProxy.attach(deployInfo[network.name].curveProxy).setPool(crosschainPool.address, crosschainPoolLp.address, deployInfo[network.name].crosschainPool[i].coins);

      deployInfo[network.name].crosschainPool[i].address = crosschainPool.address;
    }
  }

  // write out the deploy configuration
  fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./helper-hardhat-config.json",
      JSON.stringify(deployInfo, undefined, 2));
  console.log("Crosschain pool deployed!\n");



}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
