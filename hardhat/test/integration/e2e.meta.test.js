let deployInfo = require('../helper-hardhat-config.json');
const { checkoutProvider, timeout } = require("../utils/helper");
const { ethers } = require("hardhat");

describe("E2E local test", () => {
  before(async () => {
    factoryProvider = checkoutProvider({'typenet': 'devstand', 'net1': 'network1','net2': 'network2', 'net3': 'network3'})

    ERC20 = artifacts.require('ERC20Mock')
    Bridge = artifacts.require('Bridge')
    Portal = artifacts.require('Portal')
    ERC20B = artifacts.require('ERC20Mock')
    CurveProxy = artifacts.require('CurveProxy');
    CurveProxyB = artifacts.require('CurveProxy');
    StableSwap2Pool = artifacts.require('StableSwap2Pool')
  })
    
  it("Network1 to Network3", async function () {
    totalSupply = ethers.utils.parseEther("100000000000.0")
    ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
    selectorMetaExchange = web3.eth.abi.encodeFunctionSignature(
      'transit_synth_batch_meta_exchange_eth((address,address,address,uint256,int128,int128,uint256,int128,uint256,address,address,address,address,address,uint256),address[3],uint256[3],bytes32[3])'
    )
        
    CurveProxy.setProvider(factoryProvider.web3Net1)
    ERC20.setProvider(factoryProvider.web3Net1)
    Portal.setProvider(factoryProvider.web3Net1)

    CurveProxyB.setProvider(factoryProvider.web3Net3)
    ERC20B.setProvider(factoryProvider.web3Net3)

    StableSwap2Pool.setProvider(factoryProvider.web3Net2)
        
    this.userNet1 = (await CurveProxy.web3.eth.getAccounts())[0];
    this.userNet3 = (await CurveProxyB.web3.eth.getAccounts())[0];

    this.curveProxyA = CurveProxy.at(deployInfo["network1"].curveProxy)
    this.tokenA1 = await ERC20.at(deployInfo["network1"].ethToken[0].address)
    this.tokenA2 = await ERC20.at(deployInfo["network1"].ethToken[1].address)
    this.tokenA3 = await ERC20.at(deployInfo["network1"].ethToken[2].address)
    this.portal = await Portal.at(deployInfo["network1"].portal)
    this.tokenC1 = await ERC20B.at(deployInfo["network3"].ethToken[0].address)
    this.tokenC2 = await ERC20B.at(deployInfo["network3"].ethToken[1].address)
    this.tokenC3 = await ERC20B.at(deployInfo["network3"].ethToken[2].address)

    this.crosschainPoolB = StableSwap2Pool.at(deployInfo["network2"].crosschainPool)

    this.balanceC2 = (await this.tokenC2.balanceOf(this.userNet3)).toString()
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
  
    //withdraw one coin params
    const x = 1; //Index value of the coin to receive
  
    let chain2 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK3)
  
    const metaExchangeParams = {
      add: deployInfo["network2"].ethPool[0].address,
      exchange: deployInfo["network2"].crosschainPool,  //exchange pool address
      remove: deployInfo["network2"].ethPool[1].address,         //remove pool address
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
  
      await this.tokenA1.approve(this.portal.address, totalSupply,{from:this.userNet1, gasPrice: 20000000000, gas: 300_000})
      const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
      let testAmount = Math.floor((Math.random() * 100) + 1);
      amounts[0] = ethers.utils.parseEther(testAmount.toString()+".0")
      let tokensToSynth = [this.tokenA1.address, this.tokenA2.address, this.tokenA3.address]
  
      await this.portal.synthesize_batch_transit(
        tokensToSynth,
        amounts,
        synthParams,
        selectorMetaExchange,
        encodedTransitData,{from:this.userNet1, gasPrice: 20000000000, gas: 300_000}
      )
  
      await timeout(25000)
      assert(this.balanceC2 < await this.tokenC2.balanceOf(this.userNet3))
    })

    it("Network3 to Network1", async function () {
      totalSupply = ethers.utils.parseEther("100000000000.0")
      ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
      selectorMetaExchange = web3.eth.abi.encodeFunctionSignature(
        'transit_synth_batch_meta_exchange_eth((address,address,address,uint256,int128,int128,uint256,int128,uint256,address,address,address,address,address,uint256),address[3],uint256[3],bytes32[3])'
      )
      
      CurveProxy.setProvider(factoryProvider.web3Net3)
      ERC20.setProvider(factoryProvider.web3Net3)
      Portal.setProvider(factoryProvider.web3Net3)

      CurveProxyB.setProvider(factoryProvider.web3Net1)
      ERC20B.setProvider(factoryProvider.web3Net1)

      StableSwap2Pool.setProvider(factoryProvider.web3Net2)
      
      this.userNet3 = (await CurveProxy.web3.eth.getAccounts())[0];
      this.userNet1 = (await CurveProxyB.web3.eth.getAccounts())[0];

      this.curveProxyA = CurveProxy.at(deployInfo["network3"].curveProxy)
      this.tokenA1 = await ERC20.at(deployInfo["network3"].ethToken[0].address)
      this.tokenA2 = await ERC20.at(deployInfo["network3"].ethToken[1].address)
      this.tokenA3 = await ERC20.at(deployInfo["network3"].ethToken[2].address)
      this.portal = await Portal.at(deployInfo["network3"].portal)
      this.tokenC1 = await ERC20B.at(deployInfo["network1"].ethToken[0].address)
      this.tokenC2 = await ERC20B.at(deployInfo["network1"].ethToken[1].address)
      this.tokenC3 = await ERC20B.at(deployInfo["network1"].ethToken[2].address)

      this.crosschainPoolB = StableSwap2Pool.at(deployInfo["network2"].crosschainPool)

      this.balanceC2 = (await this.tokenC2.balanceOf(this.userNet1)).toString()
      //synthesize params
      const synthParams = {
        chain2address: deployInfo["network2"].curveProxy,
        receiveSide: deployInfo["network2"].curveProxy,
        oppositeBridge: deployInfo["network2"].bridge,
        chainID: deployInfo["network2"].chainId
      }
  
      //exchange params
      const i = 1; //Index value for the coin to send
      const j = 0; //Index value of the coin to receive (lp)
  
      //withdraw one coin params
      const x = 1; //Index value of the coin to receive
  
      let chain2 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK1)
  
      const metaExchangeParams = {
        add: deployInfo["network2"].ethPool[1].address,
        exchange: deployInfo["network2"].crosschainPool,  //exchange pool address
        remove: deployInfo["network2"].ethPool[0].address,         //remove pool address
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
        chain2address: deployInfo["network1"].portal,
        receiveSide: deployInfo["network1"].portal,
        oppositeBridge: deployInfo["network1"].bridge,
        chainID: deployInfo["network1"].chainId
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
  
      await this.tokenA1.approve(this.portal.address, totalSupply,{from:this.userNet3, gasPrice: 20000000000, gas: 300_000})
      const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
      let testAmount = Math.floor((Math.random() * 100) + 1);
      amounts[0] = ethers.utils.parseEther(testAmount.toString()+".0")
      let tokensToSynth = [this.tokenA1.address, this.tokenA2.address, this.tokenA3.address]
      await this.portal.synthesize_batch_transit(
        tokensToSynth,
        amounts,
        synthParams,
        selectorMetaExchange,
        encodedTransitData,{from:this.userNet3, gasPrice: 20000000000, gas: 300_000}
      )
      await timeout(25000)
      assert(this.balanceC2 < await this.tokenC2.balanceOf(this.userNet1))
}) })