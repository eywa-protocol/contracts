const fs = require("fs");
const networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");

const name = hre.network.name;

async function main() {
  const Bridge = await ethers.getContractFactory("Bridge");
  const [deployer] = await ethers.getSigners();
  const bridge  = await Bridge.attach(networkConfig[name].bridge);
  console.log("Updating epoch. Network:", name, " Owner:", deployer.address, " Bridge:", bridge.address);

  const dao = await bridge.dao();
  if (dao === '0x0000000000000000000000000000000000000000') {
    console.log("DAO not set. Setting it to the owner...");
    await bridge.daoTransferOwnership(deployer.address);
  } else if (dao !== deployer.address) {
    console.log("ERROR: DAO is already set to unknown address.");
    return;
  }

  const tx = await bridge.daoUpdateEpochRequest(true, {from: deployer.address});
  console.log("✓ Epoch update requested at tx", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
