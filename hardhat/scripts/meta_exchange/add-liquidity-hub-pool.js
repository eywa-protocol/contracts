const { network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
require('dotenv').config();


async function main() {
  console.log("\n ADD LIQUIDITY TO HUB POOL")
  const [owner] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Account: ${owner.address}`);
  const balance = await owner.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const ERC20 = await ethers.getContractFactory('ERC20Mock');
  // const StableSwap2Pool = await ethers.getContractFactory('StableSwap2Pool');
  // const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool');
  // const StableSwap4Pool = await ethers.getContractFactory('StableSwap4Pool')
  // const StableSwap5Pool = await ethers.getContractFactory('StableSwap5Pool')
  // const StableSwap6Pool = await ethers.getContractFactory('StableSwap6Pool')\
  const StableSwap7Pool = await ethers.getContractFactory('StableSwap7Pool')
  // const StableSwap8Pool = await ethers.getContractFactory('StableSwap8Pool')
  const totalSupply = ethers.utils.parseEther("100000000000.0");



  //==========================HUB-POOL=============================
  let amounts = []
  let min_mint_amount = 0

  if (network.name == "network2" || network.name == "harmonytestnet") {

    let hubPool = StableSwap7Pool.attach(deployInfo[network.name].hubPool.address);
    switch (network.name) {
      case "network2":
        hubPool = StableSwap7Pool.attach(deployInfo[network.name].hubPool.address);
        break;
      case "harmonytestnet":
        hubPool = StableSwap7Pool.attach(deployInfo[network.name].hubPool.address);
        break;
    }

    this.hubPoolCoins = deployInfo[network.name].hubPool.coins;

    for (let hubLp of this.hubPoolCoins) {
      const lp = ERC20.attach(hubLp);
      const localLpBalance = await lp.balanceOf(owner.address);
      console.log(localLpBalance);
      amounts.push(localLpBalance);
      // await (await lp.approve(hubPool.address, 0)).wait();
      await (await lp.approve(hubPool.address, totalSupply)).wait();
    }

    this.tx = await hubPool.add_liquidity(
      amounts,
      min_mint_amount,
      {
        gasLimit: '5000000'
      }
    );
    await this.tx.wait();
    console.log(`add liquidity to hub pool on ${network.name}: ${this.tx.hash}`);
  } else { console.log("NO ACTIVITY"); }
  //=================================================================================
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
