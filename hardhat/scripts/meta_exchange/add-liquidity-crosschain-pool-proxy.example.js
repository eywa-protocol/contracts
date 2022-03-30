const { network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
require('dotenv').config();


async function main() {
  console.log("\n ADD LIQUIDITY TO CROSSCHAIN POOL WITH PROXY")
  const [owner] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Network Id:", await web3.eth.net.getId());
  console.log(`Account: ${owner.address}`);
  const balance = await owner.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);

  const ERC20 = await ethers.getContractFactory('ERC20Mock');
  const Portal = await ethers.getContractFactory('Portal');
  const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool');

  const totalSupply = ethers.utils.parseEther("100000000000.0");


  // add liquidity to CROSSCHAIN pool
  let synthParams, addLiquidityParams;
  let coinsToSynth = [];
  selector = web3.eth.abi.encodeFunctionSignature(
    'transit_synth_batch_add_liquidity_3pool((address,address,uint256),address[3],uint256[3],bytes32[3])'
  )

  if (network.name == "network1" || network.name == "rinkeby") {
    // initial approval for portal
    if (network.name == "network1" || network.name == "rinkeby") {
      for (let i = 0; i < deployInfo[network.name].localToken.length; i++) {
        await ERC20.attach(deployInfo[network.name].localToken[i].address).mint(owner.address, totalSupply);
        await (await ERC20.attach(deployInfo[network.name].localToken[i].address).approve(deployInfo[network.name].portal, totalSupply)).wait();
        coinsToSynth.push(deployInfo[network.name].localToken[i].address);
      }
    }

    //add liquidity amount params
    const amountsEth = new Array(3).fill(ethers.utils.parseEther("100000000.0"));
    const expected_min_mint_amount = ethers.utils.parseEther("100000000.0");

    //synth params
    switch (network.name) {
      case "network1":
        synthParams = {
          chain2address: deployInfo["network2"].curveProxy,
          receiveSide: deployInfo["network2"].curveProxy,
          oppositeBridge: deployInfo["network2"].bridge,
          chainId: deployInfo["network2"].chainId
        }
        addLiquidityParams = {
          add: deployInfo["network2"].crosschainPool[0].address,
          to: owner.address,
          expected_min_mint_amount: expected_min_mint_amount
        }
        break;
      case "rinkeby":
        synthParams = {
          chain2address: deployInfo["mumbai"].curveProxy,
          receiveSide: deployInfo["mumbai"].curveProxy,
          oppositeBridge: deployInfo["mumbai"].bridge,
          chainId: deployInfo["mumbai"].chainId
        }
        addLiquidityParams = {
          add: deployInfo["mumbai"].crosschainPool,
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
      amountsEth,
      synthParams,
      selector,
      encodedTransitData,
      {
        gasLimit: '5000000'
      }
    );
    await tx.wait();
    console.log("synthesize_batch_transit", tx.hash);
    //=================================================================================
  }



  // test proxy
  if (network.name == "network2") {
    let lp = ERC20.attach(deployInfo["network2"].crosschainPool[0].lp[0].address);
    let pool = StableSwap3Pool.attach(deployInfo["network2"].crosschainPool[0].address);
    console.log("pool coin balance:", await pool.balances(0));
    console.log("user balance:", await lp.balanceOf(owner.address));
  }

}



main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
