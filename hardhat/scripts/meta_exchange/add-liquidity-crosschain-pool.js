const { network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
const h = require("../../utils/helper");
require('dotenv').config();


async function main() {
  console.log("\n ADD LIQUIDITY TO CROSSCHAIN POOL")
  const [owner] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Account: ${owner.address}`);
  const balance = await owner.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const ERC20 = await ethers.getContractFactory('ERC20Mock');
  // const Portal = await ethers.getContractFactory('Portal');
  const Router = await ethers.getContractFactory('Router');
  const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool');
  // const StableSwap4Pool = await ethers.getContractFactory('StableSwap4Pool');
  // const StableSwap5Pool = await ethers.getContractFactory('StableSwap5Pool');
  // const StableSwap6Pool = await ethers.getContractFactory('StableSwap6Pool');
  
  const totalSupply = ethers.utils.parseEther("100000000000.0");


  if (network.name != "network2" && network.name != "mumbai") {
    for (let i = 0; i < deployInfo[network.name].localToken.length; i++) {
      await ERC20.attach(deployInfo[network.name].localToken[i].address).mint(owner.address, totalSupply);
      await (await ERC20.attach(deployInfo[network.name].localToken[i].address).approve(deployInfo[network.name].router, totalSupply)).wait();

      let coinToSynth = deployInfo[network.name].localToken[i].address;
      let amount = ethers.utils.parseEther("100000000.0");
      let chain2 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK2);
      let to = chain2.address;
      let from = owner.address;
      let hubChainName = network.name.includes("network") ? 'network2' : 'mumbai';
      let receiveSide = deployInfo[hubChainName].synthesis;
      let oppositeBridge = deployInfo[hubChainName].bridge;
      let chainId = deployInfo[hubChainName].chainId;
      tx = await Router.attach(deployInfo[network.name].router).tokenSynthesizeRequest(
        coinToSynth,
        amount,
        from,
        {
          to: to,
          receiveSide: receiveSide,
          oppositeBridge: oppositeBridge,
          chainId: chainId
        },
        {
          gasLimit: '5000000'
        }
      );
      await tx.wait();
      console.log("synthesize stable token:", tx.hash);
      await h.timeout(8_000);
    }
  }

  // add_liquidity to crosschainPool
  if (network.name == "network2" || network.name == "mumbai") {

    // approve for crosschainPool
    for (let x = 0; x < deployInfo[network.name].crosschainPool.length; x++) {
      for (let i = 0; i < deployInfo[network.name].crosschainPool[x].coins.length; i++) {
        await (await ERC20.attach(deployInfo[network.name].crosschainPool[x].coins[i]).approve(deployInfo[network.name].crosschainPool[x].address, totalSupply)).wait();
        console.log(await ERC20.attach(deployInfo[network.name].crosschainPool[x].coins[i]).balanceOf(owner.address));
      }
    }

    // add liquidity
    for (let i = 0; i < deployInfo[network.name].crosschainPool.length; i++) {
      const amountEth = new Array(3).fill(ethers.utils.parseEther("100000000.0"));
      const min_mint_amount = 0;
      tx = await StableSwap3Pool.attach(deployInfo[network.name].crosschainPool[i].address).add_liquidity(
        amountEth,
        min_mint_amount,
        {
          gasLimit: '5000000'
        }
      );
      await tx.wait();
      console.log("add liquidity crosschainPool pool:", tx.hash);
    }
    await h.timeout(5_000);
  }
  //=================================================================================
}



main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
