const { network } = require("hardhat");
let deployInfo = require('../../helper-hardhat-config.json')

async function main() {
  console.log("\n ADD LIQUIDITY TO LOCAL POOL")
  const [owner] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Deploying with the account: ${owner.address}`);
  const balance = await owner.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const ERC20 = await ethers.getContractFactory('ERC20Mock')
  const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool')
  // const StableSwap4Pool = await ethers.getContractFactory('StableSwap4Pool')
  // const StableSwap5Pool = await ethers.getContractFactory('StableSwap5Pool')
  // const StableSwap6Pool = await ethers.getContractFactory('StableSwap6Pool')

  const totalSupply = ethers.utils.parseEther("100000000000.0")


  //===============================LOCAL-POOL========================================
  // add liquidity to local pool
  const _localPool = StableSwap3Pool.attach(deployInfo[network.name].localPool)

  for (let i = 0; i < deployInfo[network.name].localPoolCoins.length; i++) {
    await ERC20.attach(deployInfo[network.name].localToken[i].address).mint(owner.address, totalSupply)
    await (await ERC20.attach(deployInfo[network.name].localToken[i].address).approve(deployInfo[network.name].localPool, totalSupply)).wait()
  }

  const amounts = new Array(3).fill(ethers.utils.parseEther("100000000.0"))
  // const min_mint_amount = await _localPool.calc_token_amount(amounts, true); 
  // const min_mint_amount = amounts.reduce((a, b) => BigInt(a) + BigInt(b), 0) //0
  let min_mint_amount = 0

  this.tx = await _localPool.add_liquidity(
    amounts,
    min_mint_amount,
    {
      gasLimit: '5000000'
    }
  )

  console.log("add_liquidity to local pool:", tx.hash)

  //=================================================================================

}



main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
