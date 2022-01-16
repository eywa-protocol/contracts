const { network } = require("hardhat");
let deployInfo = require('../../helper-hardhat-config.json')
require('dotenv').config();


async function main() {
  console.log("\n ADD LIQUIDITY TO CROSSCHAIN POOL")
  const [owner] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Deploying with the account: ${owner.address}`);
  const balance = await owner.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const ERC20 = await ethers.getContractFactory('ERC20Mock')
  const StableSwap2Pool = await ethers.getContractFactory('StableSwap2Pool')
  const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool')
  const StableSwap4Pool = await ethers.getContractFactory('StableSwap4Pool')
  // const StableSwap5Pool = await ethers.getContractFactory('StableSwap5Pool')
  // const StableSwap6Pool = await ethers.getContractFactory('StableSwap6Pool')

  const totalSupply = ethers.utils.parseEther("100000000000.0")
  this.crosschainPoolCoins = deployInfo[network.name].crosschainPoolCoins;

  let crosschainPool = StableSwap3Pool.attach(deployInfo[network.name].crosschainPool);
  switch (network.name) {
    case "network2":
      crosschainPool = StableSwap2Pool.attach(deployInfo[network.name].crosschainPool);
      break;
    // case "mumbai":
    //   crosschainPool = StableSwap5Pool.attach(deployInfo[network.name].crosschainPool);
    //   break;
  }

  //==========================CROSSCHAIN-POOL-CROSSCHAIN=============================
  let amounts = []
  let min_mint_amount = 0

  if (network.name == "network2" || network.name == "mumbai"  ) {
    for (let crosschainLp of this.crosschainPoolCoins) {
      const lp = ERC20.attach(crosschainLp);
      const localLpBalance = await lp.balanceOf(owner.address)
      amounts.push(localLpBalance)
      await (await lp.approve(crosschainPool.address, 0)).wait()
      await (await lp.approve(crosschainPool.address, totalSupply)).wait()
    }

    this.tx = await crosschainPool.add_liquidity(
      amounts,
      min_mint_amount,
      {
        gasLimit: '5000000'
      }
    )
    await this.tx.wait()
    console.log(`add liquidity to crosschain pool on ${network.name}: ${this.tx.hash}`);
  } else {console.log("NO ACTIVITY")}
  //=================================================================================
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
