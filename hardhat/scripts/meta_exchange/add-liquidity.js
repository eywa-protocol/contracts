const fs = require("fs");
const { network } = require("hardhat");
let deployInfo = require('../../helper-hardhat-config.json')

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

  // add liquidity to local pool
  // const _localPool = StableSwap3Pool.attach(deployInfo[network.name].localPool)
  
  // for(let i=0;i<deployInfo[network.name].localPoolCoins.length;i++){
  //   await ERC20.attach(deployInfo[network.name].localToken[i].address).mint(owner.address, totalSupply)
  //   await (await ERC20.attach(deployInfo[network.name].localToken[i].address).approve(deployInfo[network.name].localPool, totalSupply)).wait()
  // }

  // const amounts = new Array(3).fill(ethers.utils.parseEther("100000.0"))
  // const min_mint_amount = await _localPool.calc_token_amount(amounts, true); //ethers.utils.parseEther("99999.0")    

  // const res = await _localPool.add_liquidity(
  //   amounts,
  //   min_mint_amount,
  //   {
  //     gasLimit: '5000000'
  //   }
  // )

  //  x = await _localPool.balances(0)
  //   console.log("awf", x)



//================================================================
  // add liquidity to ETH pool
  let synthParams,addLiquidityParams;
  let coinsToSynth = []
  selector = web3.eth.abi.encodeFunctionSignature(
    'transit_synth_batch_add_liquidity_3pool((address,address,uint256),address[3],uint256[3],bytes32[3])'
  )

  // initial approval for proxy
  if (network.name == "network1" || network.name == "rinkeby") {
    for(let i=0;i<deployInfo[network.name].localPoolCoins.length;i++){
      await ERC20.attach(deployInfo[network.name].ethToken[i].address).mint(owner.address, totalSupply)
      await (await ERC20.attach(deployInfo[network.name].ethToken[i].address).approve(deployInfo[network.name].portal, totalSupply)).wait()
      coinsToSynth.push(deployInfo[network.name].ethToken[i].address)
    }
  }
  console.log(coinsToSynth)
  //add liquidity amount params
  const amounts = new Array(3).fill(ethers.utils.parseEther("1000.0"))
  const expected_min_mint_amount = ethers.utils.parseEther("9990.0")



  //synth params
  switch (network.name) {
    case "network1":
      synthParams = {
        chain2address: deployInfo["network2"].curveProxy,
        receiveSide: deployInfo["network2"].curveProxy,
        oppositeBridge: deployInfo["network2"].bridge,
        chainID: deployInfo["network2"].chainId
      }
      addLiquidityParams = {
        add: deployInfo["network2"].ethPool,
        to: owner.address,
        expected_min_mint_amount: expected_min_mint_amount
      }
      break;
    case "rinkeby":
      synthParams = {
        chain2address: deployInfo["mumbai"].curveProxy,
        receiveSide: deployInfo["mumbai"].curveProxy,
        oppositeBridge: deployInfo["mumbai"].bridge,
        chainID: deployInfo["mumbai"].chainId
      }
      addLiquidityParams = {
        add: deployInfo["mumbai"].ethPool,
        to: owner.address,
        expected_min_mint_amount: expected_min_mint_amount
      }
      break;
  }

 

  const encodedTransitData = web3.eth.abi.encodeParameters(
    ['address', 'address', 'uint256'],
    [addLiquidityParams.add,
    addLiquidityParams.to,
    addLiquidityParams.expected_min_mint_amount
    ]
  )

  tx = await Portal.attach(deployInfo[network.name].portal).synthesize_batch_transit(
    coinsToSynth,
    amounts,
    synthParams,
    selector,
    encodedTransitData,
    {
      gasLimit: '5000000'
    }
  )
  await tx.wait()
  console.log("synthesize_batch_transit",tx.hash)


  // add liquidity to crosschain pool






  // write out the deploy configuration 
  console.log("_______________________________________");
  fs.writeFileSync("./helper-hardhat-config.json", JSON.stringify(deployInfo, undefined, 2));
  console.log("Local Pool Deployed! (saved)\n");

}



main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
