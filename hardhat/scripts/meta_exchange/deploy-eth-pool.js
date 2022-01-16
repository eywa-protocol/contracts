const fs = require("fs");
const { network } = require("hardhat");
const { getRepresentation } = require("../../utils/helper");
let deployInfo = require('../../helper-hardhat-config.json')

// eth pool params
const A = 100                 // amplification coefficient for the pool.
const fee = 4000000           // pool swap fee
const admin_fee = 5000000000
const poolSize = 3

async function main() {
  console.log("\n ETH POOL DEPLOYMENT");
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



  let ethToken = []
  let ethPoolCoins = []
  let ethPoolLp
  let ethPool

  // creating local eth tokens for specified networks
  if (network.name != "network2" || network.name != "mumbai") {
    //empty the array
    deployInfo[network.name].ethToken = []

    for (let i = 0; i < poolSize; i++) {
      ethToken[i] = await ERC20.deploy(network.name + "TokenETH" + i, "TKETH" + i)
      await ethToken[i].deployed()
      // ethToken[i] = ethToken[i].address
      deployInfo[network.name].ethToken.push({ address: ethToken[i].address, name: await ethToken[i].name(), symbol: await ethToken[i].symbol() });
      if (network.name == "network1" || network.name == "network3")
        ethPoolCoins.push(await getRepresentation(deployInfo[network.name].ethToken[i], deployInfo["network2"].synthesis))
      if (network.name == "rinkeby" || network.name == "rinkeby" || network.name == "rinkeby" || network.name == "rinkeby" || network.name == "rinkeby")
        ethPoolCoins.push(await getRepresentation(deployInfo[network.name].ethToken[i], deployInfo["mumbai"].synthesis))
    }
    if (network.name == "network1" || network.name == "network3")
      deployInfo["network2"].ethPool.push({ network: network.name, address: "", coins: ethPoolCoins, lp: [] });
    if (network.name == "rinkeby" || network.name == "rinkeby" || network.name == "rinkeby" || network.name == "rinkeby" || network.name == "rinkeby")
      deployInfo["mumbai"].ethPool.push({ network: network.name, address: "", coins: ethPoolCoins, lp: [] });

  }

  // creating the ETH pool for specified networks
  if (network.name == "network2" || network.name == "mumbai") {
    // deploy LP token
    for (let i = 0; i < deployInfo[network.name].ethPool.length; i++) {
      let net = deployInfo[network.name].ethPool[i].network

      ethPoolLp = await CurveTokenV2.deploy(net + "LpPoolETH", "LPETH", "18", 0)
      await ethPoolLp.deployed()
      deployInfo[network.name].ethPool[i].lp.push({ address: ethPoolLp.address, name: await ethPoolLp.name(), symbol: await ethPoolLp.symbol() });

      // deploy an eth pool
      switch (poolSize) {
        case 2:
          ethPool = await StableSwap2Pool.deploy(deployer.address, deployInfo[network.name].ethPool[i].coins, ethPoolLp.address, A, fee, admin_fee)
          break;
        case 3:
          ethPool = await StableSwap3Pool.deploy(deployer.address, deployInfo[network.name].ethPool[i].coins, ethPoolLp.address, A, fee, admin_fee)
          break;
        case 4:
          ethPool = await StableSwap4Pool.deploy(deployer.address, deployInfo[network.name].ethPool[i].coins, ethPoolLp.address, A, fee, admin_fee)
          break;
        case 5:
          ethPool = await StableSwap5Pool.deploy(deployer.address, deployInfo[network.name].ethPool[i].coins, ethPoolLp.address, A, fee, admin_fee)
          break;
        case 6:
          ethPool = await StableSwap6Pool.deploy(deployer.address, deployInfo[network.name].ethPool[i].coins, ethPoolLp.address, A, fee, admin_fee)
          break;
      }
      await ethPool.deployed()
      await ethPoolLp.set_minter(ethPool.address)

      // setting the eth pool in proxy contract
      await CurveProxy.attach(deployInfo[network.name].curveProxy).setPool(ethPool.address, ethPoolLp.address, deployInfo[network.name].ethPool[i].coins);

      deployInfo[network.name].ethPool[i].address = ethPool.address
    }
  }

  // write out the deploy configuration 
  console.log("_______________________________________");
  fs.writeFileSync("./helper-hardhat-config.json", JSON.stringify(deployInfo, undefined, 2));
  console.log("ETH Pool Deployed! (saved)\n");



}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
