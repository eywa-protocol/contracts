const { network, ethers } = require("hardhat");
const h = require("../../utils/helper");
let deployInfo = require('../../helper-hardhat-config.json')
require('dotenv').config();

async function main() {
  console.log("\n TRANSFER LIQUIDITY TO CROSSCHAIN POOL NETWORK")
  const [owner] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Deploying with the account: ${owner.address}`);
  const balance = await owner.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const ERC20 = await ethers.getContractFactory('ERC20Mock')
  const Portal = await ethers.getContractFactory('Portal')

  const totalSupply = ethers.utils.parseEther("100000000000.0")
  this.sourceForRepresentation = deployInfo[network.name].sourceForRepresentation;


  //==========================TRANSFER-LIQUIDITY-CROSSCHAIN=============================
  const lpToken = deployInfo[network.name].localPoolLp
  const lp = ERC20.attach(lpToken.address)
  const balanceOfLocalLp = await lp.balanceOf(owner.address)
  const valueToSend = (BigInt(balanceOfLocalLp) / (BigInt(this.sourceForRepresentation.length + 1)))
  await (await lp.approve(deployInfo[network.name].portal, 0)).wait()
  await (await lp.approve(deployInfo[network.name].portal, totalSupply)).wait()

  for (let netw of this.sourceForRepresentation) {
    let chain2 = new ethers.Wallet(eval("process.env.PRIVATE_KEY_" + deployInfo[netw].n))
    let receiveSide = deployInfo[netw].synthesis
    let oppositeBridge = deployInfo[netw].bridge
    let chainID = deployInfo[netw].chainId

    tx = await Portal.attach(deployInfo[network.name].portal).synthesize(
      lp.address,
      valueToSend,
      chain2.address,
      receiveSide,
      oppositeBridge,
      chainID,
      {
        gasLimit: '5000000'
      }
    )
    await tx.wait()
    console.log(`synthesize for local pool LP from ${network.name} to ${netw}: ${this.tx.hash}`);
    await h.timeout(8_000);

  }


  //=================================================================================

}



main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
