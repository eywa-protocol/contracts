const fs = require("fs");
// const hre = require("hardhat");
const { getRepresentation } = require("../../utils/helper");
let deployInfo = require('../../helper-hardhat-config.json');
const { network } = require("hardhat");



async function main() {
  console.log("\n CROSSCHAIN POOL DEPLOYMENT");
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

  const totalSupply = ethers.utils.parseEther("100000000000.0")
  ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
  selectorMetaExchange = web3.eth.abi.encodeFunctionSignature(
    'transit_meta_exchange((address,address,int128,int128,uint256,int128,uint256,address,address,address,address,address,uint256),address,uint256,bytes32)'
  )

  const curveProxyA = CurveProxy.attach(deployInfo["network1"].curveProxy)
  const tokenA1 = ERC20.attach(deployInfo["network1"].localToken[0].address)
  const tokenB1 = ERC20.attach(deployInfo["network2"].localToken[1].address)
  const tokenLpLocalA = ERC20.attach(deployInfo["network1"].localPoolLp.address)
  const tokenLpLocalB = ERC20.attach(deployInfo["network2"].localPoolLp.address)
  const crosschainPoolB = StableSwap4Pool.attach(deployInfo["network2"].crosschainPool)
  const localPoolA = StableSwap3Pool.attach(deployInfo["network1"].localPool)
  const localPoolB = StableSwap3Pool.attach(deployInfo["network2"].localPool)

  if (network.name == "network1" || network.name == "rinkeby") {
  //add liquidity amount params
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
  const expected_dy = ethers.utils.parseEther("10.0") //await crosschainPoolB.get_dy(i, j, dx)

  //withdraw one coin params
  const x = 1; //Index value of the coin to receive
  const expected_min_amount =  ethers.utils.parseEther("8.0") //await localPoolB.calc_withdraw_one_coin(expected_dy, x)

  let chain2 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK2)

  const metaExchangeParams = {
    exchange: deployInfo["network2"].crosschainPool,  //exchange pool address
    remove: deployInfo["network2"].localPool,         //remove pool address
    //exchange params
    i: i,                                             //index value for the coin to send
    j: j,                                             //index value of the coin to receive
    expected_min_dy: expected_dy,
    //withdraw one coin params
    x: x,                                             // index value of the coin to withdraw
    expected_min_amount: expected_min_amount,
    //mint synth params
    to: chain2.address,
    //unsynth params (empty in this case)
    unsynth_token: ZERO_ADDRESS,
    chain2address: ZERO_ADDRESS,
    receiveSide: ZERO_ADDRESS,
    oppositeBridge: ZERO_ADDRESS,
    chainID: 0
  }

  const encodedTransitData = web3.eth.abi.encodeParameters(
    ['address', 'address', 'int128', 'int128', 'uint256', 'int128', 'uint256',
      'address', 'address', 'address', 'address', 'address', 'uint256'],
    [metaExchangeParams.exchange,
    metaExchangeParams.remove,
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


  await tokenA1.approve(curveProxyA.address, totalSupply)
  const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
  amounts[0] = ethers.utils.parseEther("10.0")
  const min_mint_amount = 0;

   tx = await curveProxyA.add_liquidity_3pool_transit_synthesize(
        deployInfo["network1"].localPool,
        amounts,
        min_mint_amount,
        ///////////////
        synthParams,
        selectorMetaExchange,
        encodedTransitData,
        {
          gasLimit: '5000000'
        }
    )

    await tx.wait()
    console.log("add_liquidity_3pool_transit_synthesize:", tx.hash)

  }

  if (network.name == "network2") {
    
    console.log(await tokenB1.balanceOf(owner.address))
    console.log(await tokenLpLocalB.balanceOf(owner.address))

    //for (lp of deployInfo["network2"].crosschainPoolCoins){
      let tokenBLP = ERC20.attach(deployInfo["network2"].crosschainPoolCoins[0])
      console.log(await tokenBLP.balanceOf(owner.address))
   // }
    
    // console.log(await crosschainPoolB.coins(1))

    // console.log(tokenLpLocalA.address)
    // console.log(await getRepresentation({ address: tokenLpLocalA.address, name: await tokenLpLocalA.name(), symbol:await tokenLpLocalA.symbol() }, deployInfo["network2"].synthesis))

  }


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
