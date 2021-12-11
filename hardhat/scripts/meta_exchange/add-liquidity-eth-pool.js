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


//===================================ETH-POOL=======================================
  // synthesize ETH tokens net1 => net2
  if (network.name == "network1" /*|| network.name == "rinkeby"*/) {
    for(let i=0;i<deployInfo[network.name].ethToken.length;i++){
      await ERC20.attach(deployInfo[network.name].ethToken[i].address).mint(owner.address, totalSupply)
      await (await ERC20.attach(deployInfo[network.name].ethToken[i].address).approve(deployInfo[network.name].portal, totalSupply)).wait()
      let coinToSynth = deployInfo[network.name].ethToken[i].address;
      let amount = ethers.utils.parseEther("1000.0")
      // let privateKey = "0x3141592653589793238462643383279502884197169399375105820974944592"
        let chain2 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK2)
      let chain2address = chain2.address                                                  
      let receiveSide = deployInfo["network2"].synthesis
      let oppositeBridge = deployInfo["network2"].bridge
      let chainID = deployInfo["network2"].chainId
      tx = await Portal.attach(deployInfo[network.name].portal).synthesize(
        coinToSynth,
        amount,
        chain2address,
        receiveSide,
        oppositeBridge,
        chainID,
        {
          gasLimit: '5000000'
        }
      )
      await tx.wait()
      console.log("synthesize ETH token",tx.hash)

    }
  }


  // add_liquidity to ethPool
  if (network.name == "network2" /*|| network.name == "mumbai"*/) {

    // approve for ethPool
    for(let i=0;i<deployInfo[network.name].ethPoolCoins.length;i++){
      await (await ERC20.attach(deployInfo[network.name].ethPoolCoins[i]).approve(deployInfo[network.name].ethPool, totalSupply)).wait()
    }

    let amountEth = new Array(3).fill(ethers.utils.parseEther("1000.0"))
    let min_mint_amout = ethers.utils.parseEther("999.0")
    tx = await StableSwap3Pool.attach(deployInfo[network.name].ethPool).add_liquidity(
      amountEth,
      min_mint_amout,
      {
        gasLimit: '5000000'
      }
    )
    await tx.wait()
    console.log("add_liquidity ETH pool",tx.hash)
  }
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
