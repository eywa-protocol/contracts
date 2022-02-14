const { network } = require("hardhat");
let deployInfo = require('../../helper-hardhat-config.json')
const h = require("../../utils/helper");
require('dotenv').config();


async function main() {
  console.log("\n ADD LIQUIDITY TO LOCAL POOL")
  const [owner] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Account: ${owner.address}`);
  const balance = await owner.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const ERC20 = await ethers.getContractFactory('ERC20Mock')
  const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool')
  
  const totalSupply = ethers.utils.parseEther("100000000000.0")


  if (network.name == "network2" || network.name == "mumbai") {
    for (let i = 0; i < deployInfo[network.name].localToken.length; i++) {
      let locTk = await ERC20.attach(deployInfo[network.name].localToken[i].address);
      let tx    = await locTk.mint(owner.address, totalSupply)
      await tx.wait();
      // approve for localPool
      tx = await locTk.approve(deployInfo[network.name].localPool.address, totalSupply)
      await tx.wait();

      console.log("minted ETH token", tx.hash)
      
    }

    // add liquidity
    const amountEth = new Array(3).fill(ethers.utils.parseEther("100000000.0"))
    const min_mint_amount = 0
    let tx = await StableSwap3Pool.attach(deployInfo[network.name].localPool.address).add_liquidity(
        amountEth,
        min_mint_amount,
        {
          gasLimit: '5000000'
        }
    );
    await tx.wait();
    console.log("local pool has been filled:", tx.hash)
  }

}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
