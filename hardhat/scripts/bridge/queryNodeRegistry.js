// npx hardhat run --no-compile scripts/bridge/queryNodeRegistry.js --network network1

let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
const hre = require("hardhat");

async function main() {

  const [deployer] = await ethers.getSigners();
  console.log("Owner:", deployer.address);

  const nr = await ethers.getContractAt("NodeRegistry", networkConfig[network.name].bridge);
  const sn = await nr.getSnapshot();
  console.log(sn);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
