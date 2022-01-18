const fs = require("fs");
// const hre = require("hardhat");
const { getRepresentation } = require("../../utils/helper");
let deployInfo = require('../../helper-hardhat-config.json');
const { network } = require("hardhat");



async function main() {
  console.log("\n hub POOL DEPLOYMENT");
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
  const StableSwap2Pool = await ethers.getContractFactory('StableSwap2Pool')
  const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool')
  const StableSwap4Pool = await ethers.getContractFactory('StableSwap4Pool')
  const StableSwap5Pool = await ethers.getContractFactory('StableSwap5Pool')
  const StableSwap6Pool = await ethers.getContractFactory('StableSwap6Pool')

  const totalSupply = ethers.utils.parseEther("100000000000.0")
  ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
  selectorMetaExchange = web3.eth.abi.encodeFunctionSignature(
    'transit_synth_batch_meta_exchange_eth((address,address,address,uint256,int128,int128,uint256,int128,uint256,address,address,address,address,address,uint256),address[3],uint256[3],bytes32[3])'
  )

  const curveProxyA = CurveProxy.attach(deployInfo["network1"].curveProxy)
  const tokenA1 = ERC20.attach(deployInfo["network1"].localToken[0].address)
  const tokenA2 = ERC20.attach(deployInfo["network1"].localToken[1].address)
  const tokenA3 = ERC20.attach(deployInfo["network1"].localToken[2].address)
  const portal = Portal.attach(deployInfo["network1"].portal)
  const tokenC1 = ERC20.attach(deployInfo["network3"].localToken[0].address)
  const tokenC2 = ERC20.attach(deployInfo["network3"].localToken[1].address)
  const tokenC3 = ERC20.attach(deployInfo["network3"].localToken[2].address)
  // const tokenLpLocalA = ERC20.attach(deployInfo["network1"].crosschainPool.address)
  // const tokenLpLocalB = ERC20.attach(deployInfo["network2"].localPoolLp.address)
  const hubPoolB = StableSwap2Pool.attach(deployInfo["network2"].hubPool)
  // const localPoolA = StableSwap3Pool.attach(deployInfo["network1"].crosschainPool[0].address)
  // const localPoolB = StableSwap3Pool.attach(deployInfo["network3"].crosschainPool[1].address)

  // console.log(await tokenA1.balanceOf(owner.address))

  if (network.name == "network1" || network.name == "rinkeby") {
    // add liquidity amount params
    // const min_mint_amount = ethers.utils.parseEther("30.0")            // Minimum amount of LP tokens to mint from the deposit
    // const amounts = new Array(3).fill(ethers.utils.parseEther("10.0")) //List of amounts of coins to deposit

    //synthesize params
    const synthParams = {
      chain2address: deployInfo["network2"].curveProxy,
      receiveSide: deployInfo["network2"].curveProxy,
      oppositeBridge: deployInfo["network2"].bridge,
      chainID: deployInfo["network2"].chainId
    }

    //exchange params
    const i = 0; //Index value for the coin to send
    const j = 1; //Index value of the coin to receive (lp)
    const dx = ethers.utils.parseEther("10.0") //await lpLocalA.balanceOf(accounts[0].address)
    const expected_dy = ethers.utils.parseEther("10.0") //await hubPoolB.get_dy(i, j, dx)

    //withdraw one coin params
    const x = 1; //Index value of the coin to receive
    const expected_min_amount = ethers.utils.parseEther("8.0") //await localPoolB.calc_withdraw_one_coin(expected_dy, x)

    let chain2 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK3)

    const metaExchangeParams = {
      add: deployInfo["network2"].crosschainPool[0].address,
      exchange: deployInfo["network2"].hubPool,  //exchange pool address
      remove: deployInfo["network2"].crosschainPool[1].address,         //remove pool address
      //add liquidity params
      expected_min_mint_amount: 0,
      //exchange params
      i: i,                                             //index value for the coin to send
      j: j,                                             //index value of the coin to receive
      expected_min_dy: 0,
      //withdraw one coin params
      x: x,                                             // index value of the coin to withdraw
      expected_min_amount: 0,
      //mint synth params
      to: chain2.address,
      //unsynth params (empty in this case)
      unsynth_token: ZERO_ADDRESS,
      chain2address: deployInfo["network3"].portal,
      receiveSide: deployInfo["network3"].portal,
      oppositeBridge: deployInfo["network3"].bridge,
      chainID: deployInfo["network3"].chainId
    }

    const encodedTransitData = web3.eth.abi.encodeParameters(
      ['address', 'address', 'address', 'uint256', 'int128', 'int128', 'uint256', 'int128', 'uint256',
        'address', 'address', 'address', 'address', 'address', 'uint256'],
      [metaExchangeParams.add,
      metaExchangeParams.exchange,
      metaExchangeParams.remove,
      /////
      metaExchangeParams.expected_min_mint_amount,
      /////
      metaExchangeParams.i,
      metaExchangeParams.j,
      metaExchangeParams.expected_min_dy,
      /////
      metaExchangeParams.x,
      metaExchangeParams.expected_min_amount,
      /////
      metaExchangeParams.to,
      /////
      metaExchangeParams.unsynth_token,
      metaExchangeParams.chain2address,
      metaExchangeParams.receiveSide,
      metaExchangeParams.oppositeBridge,
      metaExchangeParams.chainID
      ]
    )


    await tokenA1.approve(portal.address, totalSupply)
    const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
    amounts[0] = ethers.utils.parseEther("10.0")
    const min_mint_amount = 0;
    let tokensToSynth = [tokenA1.address, tokenA2.address, tokenA3.address]
    // tokensToSynth[0] = tokenA1.address
    console.log(tokensToSynth)

    tx = await portal.synthesize_batch_transit(
      tokensToSynth,
      amounts,
      synthParams,
      selectorMetaExchange,
      encodedTransitData
    )

    await tx.wait()
    console.log("synthesize_batch_transit:", tx.hash)

  }

  if (network.name == "network2") {
    // console.log(await hubPoolB.get_dy(0, 1, ethers.utils.parseEther("10.0")))
  //   console.log(await tokenB1.balanceOf(owner.address))
  //   console.log(await tokenLpLocalB.balanceOf(owner.address))

  //   //for (lp of deployInfo["network2"].hubPoolCoins){
  //     let tokenBLP = ERC20.attach(deployInfo["network2"].hubPoolCoins[0])
  //     console.log(await tokenBLP.balanceOf(owner.address))
  //  // }

  //   // console.log(await hubPoolB.coins(1))

  //   // console.log(tokenLpLocalA.address)
  //   // console.log(await getRepresentation({ address: tokenLpLocalA.address, name: await tokenLpLocalA.name(), symbol:await tokenLpLocalA.symbol() }, deployInfo["network2"].synthesis))

  }

  if (network.name == "network3") {
    console.log(await tokenC1.balanceOf(owner.address))
    console.log(await tokenC2.balanceOf(owner.address))
    console.log(await tokenC3.balanceOf(owner.address))
    
  }

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
