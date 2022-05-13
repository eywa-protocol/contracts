// npx hardhat run scripts/dao/transferOwnership.js --network network1

const fs = require("fs");
const networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const hre = require("hardhat");

const name = hre.network.name;

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.getBalance();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Deploying with the account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  // @todo replace new owner
  const newOwner = '0x970e8aa8bda0347ae52b17cc4e6580589c74c8a1';
  console.log('New Owner address: ', newOwner);

  const Synthesis = await ethers.getContractFactory("Synthesis");
  const Portal = await ethers.getContractFactory("Portal");
  const CurveProxy = await ethers.getContractFactory('CurveProxy');
  const Router = await ethers.getContractFactory("Router");
  const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
  // const Bridge = await ethers.getContractFactory("Bridge");

  let syntesisAddress = networkConfig[network.name].synthesis;
  let portalAddress = networkConfig[network.name].portal;
  let curveProxyAddress = networkConfig[network.name].curveProxy;
  let routerAddress = networkConfig[network.name].router;
  let nodeRegistryAddress = networkConfig[network.name].bridge;
  // let bridgeAddress = networkConfig[network.name].bridge;

  console.log('Syntesis address: ', syntesisAddress);
  console.log('Portal address: ', portalAddress);
  console.log('CurveProxy address: ', curveProxyAddress);
  console.log('Router address: ', routerAddress);
  console.log('NodeRegistry address: ', nodeRegistryAddress);
  // console.log("Bridge address:", bridgeAddress);

  const synthesis = await Synthesis.attach(syntesisAddress);
  const portal = await Portal.attach(portalAddress);
  const curveProxy = await CurveProxy.attach(curveProxyAddress);
  const router = await Router.attach(routerAddress);
  const nodeRegistry = await NodeRegistry.attach(nodeRegistryAddress);
  // const bridge = await Bridge.attach(bridgeAddress);

  let tx = await synthesis.transferOwnership(newOwner, { gasLimit: "1000000" });
  await tx.wait();
  console.log("Synthesis transferOwnership hash", tx.hash);

  tx = await portal.transferOwnership(newOwner, { gasLimit: "1000000" });
  await tx.wait();
  console.log("Portal transferOwnership hash", tx.hash);

  tx = await router.transferOwnership(newOwner, { gasLimit: "1000000" });
  await tx.wait();
  console.log("Router transferOwnership hash", tx.hash);

  tx = await nodeRegistry.transferOwnership(newOwner, { gasLimit: "1000000" });
  await tx.wait();
  console.log("NodeRegistry transferOwnership hash", tx.hash);



  // tx = await curveProxy.transferOwnership(newOwner);
  // await tx.wait();
  // console.log("CurveProxy transferOwnership hash", tx.hash);

  // tx = await bridge.transferOwnership(newOwner);
  // await tx.wait();
  // console.log("Bridge transferOwnership hash", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
