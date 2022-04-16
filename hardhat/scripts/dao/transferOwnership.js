// npx hardhat run scripts/dao/transferOwnership.js --network network1

const fs = require("fs");
const networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const hre = require("hardhat");

const name  = hre.network.name;

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance  = await deployer.getBalance();
  // @todo replace new owner
  const newOwner = '0xA274C37FD645B4389c2D601c85C4908f7e46f203';
  console.log('New Owner address: ', newOwner);

  const Synthesis = await ethers.getContractFactory("Synthesis");
  const Portal = await ethers.getContractFactory("Portal");
  const CurveProxy = await ethers.getContractFactory('CurveProxy');
  const Router = await ethers.getContractFactory("Router");

  let syntesisAddress = networkConfig[network.name].synthesis;
  let portalAddress = networkConfig[network.name].portal;
  let curveProxyAddress = networkConfig[network.name].curveProxy;
  let routerAddress = networkConfig[network.name].router;

  console.log('Syntesis address: ', syntesisAddress);
  console.log('Portal address: ', portalAddress);
  console.log('CurveProxy address: ', curveProxyAddress);
  console.log('Router address: ', routerAddress);

  const synthesis = await Synthesis.attach(syntesisAddress);
  const portal = await Portal.attach(portalAddress);
  const curveProxy = await CurveProxy.attach(curveProxyAddress);
  const router = await Router.attach(routerAddress);

  let tx = await synthesis.transferOwnership(newOwner);
  await tx.wait();
  console.log("Synthesis transferOwnership hash", tx.hash);

  tx = await portal.transferOwnership(newOwner);
  await tx.wait();
  console.log("Portal transferOwnership hash", tx.hash);

  tx = await curveProxy.transferOwnership(newOwner);
  await tx.wait();
  console.log("CurveProxy transferOwnership hash", tx.hash);

  tx = await router.transferOwnership(newOwner);
  await tx.wait();
  console.log("Router transferOwnership hash", tx.hash);

  const Bridge = await ethers.getContractFactory("Bridge");

  let bridgeAddress = networkConfig[network.name].bridge;

  console.log("Bridge address:", bridgeAddress);

  const bridge = await Bridge.attach(bridgeAddress);

  tx = await bridge.transferOwnership(newOwner);
  await tx.wait();
  console.log("Bridge transferOwnership hash", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
