const fs = require("fs");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { network } = require("hardhat");

async function main() {
  console.log("\n ADD TRUSTED WORKER");
  const [owner] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Account: ${owner.address}`);
  const balance = await owner.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const Router = await ethers.getContractFactory('Router');
  const router = await Router.attach("0xc49a5C13E550414f0e4403aBc2a660Fd896be885");
  await router.setTrustedWorker("0xA530c0122a16734A2e7e3E4497101eAa17057fe8");
  tx = await router._trustedWorker("0xA530c0122a16734A2e7e3E4497101eAa17057fe8")
  console.log(tx )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
