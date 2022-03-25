const fs = require("fs");
const networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const hre = require("hardhat");

const name  = hre.network.name;
const addr  = process.env.ADDR.trim();
const limit = process.env.AMOUNT.trim();

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance    = await deployer.getBalance();
  console.log("Minting tokens. Network:", name, " Owner:", deployer.address, " Balance deployer: ", ethers.utils.formatEther(balance), " Node:", addr);
  if (ethers.utils.formatEther(balance) <= 1.5) {
    console.warn("\x1b[31m%s\x1b[0m", "> WARN. Does't enough funds! Were skiped.");
    return;
  }

  let recepient         = await ethers.getSigner(addr);
  let recepient_balance = await recepient.getBalance();
  if (ethers.utils.formatEther(recepient_balance) <= limit) {
    const tx = await deployer.sendTransaction({to: addr, value: ethers.utils.parseEther(limit.toString())});
    console.log("Send: ", tx.hash);
  }

  const eywa_addr = networkConfig[name].eywa;
  if (eywa_addr === undefined || eywa_addr === "0x0000000000000000000000000000000000000000") {
    console.log("Eywa contract not deployed on this network, skipping.");
    return;
  }

  const Eywa = await ethers.getContractFactory("TestTokenPermit");
  const eywa = await Eywa.attach(eywa_addr);
  const ebal = await eywa.balanceOf(addr);
  if (ethers.utils.formatEther(ebal) >= limit) {
    console.log(`Balance of tokens eywa on address: ${addr} is enough: ${ethers.utils.formatEther(ebal)}`);
    return;
  }

  console.log("Eywa: ", eywa_addr);
  const tx2 = await eywa.mint(addr, "100000000000000000000");
  console.log("Mine: ", tx2.hash);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
