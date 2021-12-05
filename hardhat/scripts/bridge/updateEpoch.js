const fs = require("fs");
const networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");
const { networks } = require('../../hardhat.config');
const args = process.env.NETWORKS.split(' ') || [];

function getProvider(url) {
  return new ethers.providers.JsonRpcProvider(url);
}

async function main() {
  return Promise.all(args.map(network => update(network)))
}

async function update(network) {
  const provider = getProvider(networks[network].url);
  const deployer = await provider.getSigner();
  const Bridge = await ethers.getContractFactory("Bridge");
  const bridge  = await Bridge.attach(networkConfig[network].bridge).connect(provider);
  console.log("Updating epoch. Network:", network, " Owner:", deployer.address, " Bridge:", bridge.address);

  const dao = await bridge.dao();
  if (dao === '0x0000000000000000000000000000000000000000') {
    console.log("DAO not set. Setting it to the owner...");
    await bridge.connect(deployer).daoTransferOwnership(deployer.address);
  } else if (dao !== deployer.address) {
    console.log("ERROR: DAO is already set to unknown address", dao);
    return;
  }

  const tx = await bridge.connect(deployer).daoUpdateEpochRequest(true);
  console.log("✓ Epoch update requested at tx", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
