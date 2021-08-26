const fs = require("fs");
const networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");

const name = hre.network.name;
const addr = process.env.ADDR.trim();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Minting tokens. Network:", name, " Owner:", deployer.address, " Node:", addr);

  const tx = await deployer.sendTransaction({to: addr, value: ethers.utils.parseEther("1.0")});
  console.log('Send:', tx.hash);

  const Eywa = await ethers.getContractFactory("TestTokenPermit");
  const eywa  = await Eywa.attach(networkConfig[name].eywa);
  console.log("Eywa: ", networkConfig[name].eywa);
  const tx2 = await eywa.mint(addr, "1000000000000000000");
  console.log('Mine:', tx2.hash);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
