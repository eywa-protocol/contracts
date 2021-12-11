const fs = require("fs");
const { network } = require("hardhat");
let deployInfo = require('../../helper-hardhat-config.json')
const { addressToBytes32, getRepresentation } = require('../../utils/helper');
require('dotenv').config();

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Deploying with the account: ${owner.address}`);
  const balance = await owner.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const ERC20 = await ethers.getContractFactory('ERC20Mock')
  const Bridge = await ethers.getContractFactory('Bridge')
  const Portal = await ethers.getContractFactory('Portal')
  const Synthesis = await ethers.getContractFactory('Synthesis')
  const CurveProxy = await ethers.getContractFactory('CurveProxy');
  const CurveTokenV2 = await ethers.getContractFactory('CurveTokenV2')
  const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool')
  const StableSwap4Pool = await ethers.getContractFactory('StableSwap4Pool')
  const StableSwap5Pool = await ethers.getContractFactory('StableSwap5Pool')
  const StableSwap6Pool = await ethers.getContractFactory('StableSwap6Pool')

  const totalSupply = ethers.utils.parseEther("10000000000.0")



//==========================CROSSCHAIN-POOL-CROSSCHAIN=============================
  // add liquidity to crosschain pool
//=================================================================================





  // write out the deploy configuration 
  console.log("_______________________________________");
  fs.writeFileSync("./helper-hardhat-config.json", JSON.stringify(deployInfo, undefined, 2));
  // console.log("Local Pool Deployed! (saved)\n");

}



main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
