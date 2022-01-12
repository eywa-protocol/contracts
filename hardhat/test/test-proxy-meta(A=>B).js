const { expect } = require('chai')
const { ethers, network } = require('hardhat')
const web3Abi = require("web3-eth-abi");
let deployInfo = require('../helper-hardhat-config.json');


describe('CURVE CROSSCHAIN PROXY', () => {

  before(async () => {
    accounts = await ethers.getSigners();

    totalSupply = ethers.utils.parseEther("1000.0")
    forwarder = web3.utils.randomHex(20)
    ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
    coinsCrosschainB = [/* [0]lpLocalA,[1]lpLocalC,[2]lpLocalB */]
    selectorMetaExchange = web3.eth.abi.encodeFunctionSignature(
      'transit_meta_exchange((address,address,int128,int128,uint256,int128,uint256,address,address,address,address,address,uint256),address,uint256,bytes32)'
    )

    CurveProxy = await ethers.getContractFactory('CurveProxy')
    Bridge = await ethers.getContractFactory('Bridge')
    Portal = await ethers.getContractFactory('Portal')
    Synthesis = await ethers.getContractFactory('Synthesis')
    ERC20 = await ethers.getContractFactory('ERC20Mock')
    CurveTokenV2 = await ethers.getContractFactory('CurveTokenV2')
    SyntERC20 = await ethers.getContractFactory('SyntERC20')
    StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool')

  });

  describe('testing meta-exchange...', () => {


    it('CurveProxy: meta-exchange', async function () {
      // initial approval for proxy
      const tokenA1 = ERC20.attach(deployInfo["network1"].localToken[0].address)
      const tokenA2 = ERC20.attach(deployInfo["network1"].localToken[1].address)
      const tokenA3 = ERC20.attach(deployInfo["network1"].localToken[2].address)
      const curveProxyA = CurveProxy.attach(deployInfo["network1"].curveProxy)
      const crosschainPoolB = StableSwap3Pool.attach(deployInfo["network2"].crosschainPool)
      const localPoolB = StableSwap3Pool.attach(deployInfo["network2"].localPool)

      await (await tokenA1.approve(curveProxyA.address, totalSupply)).wait()
      await (await tokenA2.approve(curveProxyA.address, totalSupply)).wait()
      await (await tokenA3.approve(curveProxyA.address, totalSupply)).wait()

      //add liquidity amount params
      const min_mint_amount = ethers.utils.parseEther("30.0")            // Minimum amount of LP tokens to mint from the deposit
      const amounts = new Array(3).fill(ethers.utils.parseEther("10.0")) //List of amounts of coins to deposit

      //exchange params
      const i = 0; //Index value for the coin to send
      const j = 2; //Index value of the coin to receive (lpLocalB)
      const dx = ethers.utils.parseEther("30.0") 
      const expected_dy = await crosschainPoolB.get_dy(i, j, dx)

      //withdraw one coin params
      const x = 1; //Index value of the coin to receive (tokenB2)
      const expected_min_amount = await localPoolB.calc_withdraw_one_coin(expected_dy, x)

      //synth params
      const synthParams = {
        chain2address: deployInfo["network2"].curveProxy,  //curveProxyB.address,
        receiveSide: deployInfo["network2"].curveProxy,    //curveProxyB.address,
        oppositeBridge: deployInfo["network1"].bridge, //bridgeA.address,
        chainID: deployInfo["network2"].chainId
      }

      const metaExchangeParams = {
        exchange: deployInfo["network2"].crosschainPool, //crosschainPoolB.address, //exchange pool address
        remove: deployInfo["network2"].localPool,   //localPoolB.address,      //remove pool address
        //exchange params
        i: i,                       //index value for the coin to send
        j: j,                       //index value of the coin to receive
        expected_min_dy: expected_dy,
        //withdraw one coin params
        x: x,                                           // index value of the coin to withdraw
        expected_min_amount: expected_min_amount,
        //mint synth params
        to: accounts[1].address,
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

      tx = await curveProxyA.add_liquidity_3pool_transit_synthesize(
        deployInfo["network1"].localPool, //localPoolA.address,
        amounts,
        min_mint_amount,
        synthParams,
        selectorMetaExchange,
        encodedTransitData,
        {
          gasLimit: '5000000'
        }
      )
      const rec = await tx.wait()
      console.log("add_liquidity_3pool_transit_synthesize GAS:", parseInt(rec.gasUsed))


      // expect(await lpLocalA.balanceOf(accounts[1].address)).to.be.equal(0)
      console.log("add_liquidity_3pool_transit_synthesize:", tx.hash)

      /////////////////////////////P2P////////////////////////////////
      ////////////////////////////////////////////////////////////////
    })




    // it('CurveProxy: meta-exchange (with unsynth)', async function () {
    //   // initial approval for proxy
    //   await (await tokenA1.approve(curveProxyA.address, totalSupply)).wait()
    //   await (await tokenA2.approve(curveProxyA.address, totalSupply)).wait()
    //   await (await tokenA3.approve(curveProxyA.address, totalSupply)).wait()

    //   //add liquidity amount params
    //   const min_mint_amount = ethers.utils.parseEther("30.0")            // Minimum amount of LP tokens to mint from the deposit
    //   const amounts = new Array(3).fill(ethers.utils.parseEther("10.0")) //List of amounts of coins to deposit

    //   //synthesize params
    //   const synthParams = {
    //     chain2address: curveProxyB.address,
    //     receiveSide: curveProxyB.address,
    //     oppositeBridge: bridgeA.address,
    //     chainID: 1
    //   }

    //   //exchange params
    //   const i = 0; //Index value for the coin to send
    //   const j = 1; //Index value of the coin to receive (lp)
    //   const dx = ethers.utils.parseEther("30.0") //await lpLocalA.balanceOf(accounts[0].address)
    //   const expected_dy = await crosschainPoolB.get_dy(i, j, dx)

    //   //withdraw one coin params
    //   const x = 1; //Index value of the coin to receive
    //   const expected_min_amount = await localPoolC.calc_withdraw_one_coin(expected_dy, x)

    //   const metaExchangeParamsWithUnsynth = {
    //     exchange: crosschainPoolB.address,     //exchange pool address
    //     remove: localPoolC.address,            //remove pool address
    //     //exchange params
    //     i: i,                                  //index value for the coin to send
    //     j: j,                                  //index value of the coin to receive
    //     expected_min_dy: expected_dy,
    //     //withdraw one coin params
    //     x: x,                                  // index value of the coin to withdraw
    //     expected_min_amount: expected_min_amount,
    //     //mint synth params
    //     to: accounts[1].address,
    //     //unsynth params
    //     unsynth_token: lpLocalC.address,
    //     chain2address: curveProxyC.address,
    //     receiveSide: curveProxyC.address,
    //     oppositeBridge: bridgeB.address,
    //     chainID: 1
    //   }

    //   const encodedTransitDataWithUnsynth = web3.eth.abi.encodeParameters(
    //     ['address', 'address', 'int128', 'int128', 'uint256', 'int128', 'uint256',
    //       'address', 'address', 'address', 'address', 'address', 'uint256'],
    //     [metaExchangeParamsWithUnsynth.exchange,
    //     metaExchangeParamsWithUnsynth.remove,
    //     /////
    //     metaExchangeParamsWithUnsynth.i,
    //     metaExchangeParamsWithUnsynth.j,
    //     metaExchangeParamsWithUnsynth.expected_min_dy,
    //     ////
    //     metaExchangeParamsWithUnsynth.x,
    //     metaExchangeParamsWithUnsynth.expected_min_amount,
    //     /////
    //     metaExchangeParamsWithUnsynth.to,
    //     /////
    //     metaExchangeParamsWithUnsynth.unsynth_token,
    //     metaExchangeParamsWithUnsynth.chain2address,
    //     metaExchangeParamsWithUnsynth.receiveSide,
    //     metaExchangeParamsWithUnsynth.oppositeBridge,
    //     metaExchangeParamsWithUnsynth.chainID,
    //     ]
    //   )

    //   expect(tx = await curveProxyA.add_liquidity_3pool_transit_synthesize(
    //     localPoolA.address,
    //     amounts,
    //     min_mint_amount,
    //     ///////////////
    //     synthParams,
    //     selectorMetaExchange,
    //     encodedTransitDataWithUnsynth,
    //     {
    //       gasLimit: '5000000'
    //     }
    //   )).to.emit(localPoolA, 'AddLiquidity')

    //   const rec = await tx.wait()
    //   console.log("add_liquidity_3pool_transit_synthesize (with unsynth) GAS:", parseInt(rec.gasUsed))

    //   expect(await lpLocalA.balanceOf(accounts[1].address)).to.be.equal(0)
    //   console.log("add_liquidity_3pool_transit_synthesize (with unsynth):", tx.hash)

    //    ///////////////////////////P2P////////////////////////////////
    //   await new Promise(event => setTimeout(() => event(null), 5000));
    //   await new Promise(event => setTimeout(() => event(null), 5000));
    //   ///////////////////////////////////////////////////////////////

    //   expect(await tokenC2.balanceOf(accounts[1].address)).to.be.equal(expected_min_amount)

    // })



    function getCreate2Address(creatorAddress, saltHex, byteCode) {
      return `0x${web3.utils.sha3(`0x${[
        'ff',
        creatorAddress,
        saltHex,
        web3.utils.sha3(byteCode)
      ].map(x => x.replace(/0x/, ''))
        .join('')}`).slice(-40)}`.toLowerCase()
    }

  });
});
