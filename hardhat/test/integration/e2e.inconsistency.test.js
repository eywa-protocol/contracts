let deployInfo = require('../../helper-hardhat-config.json');
const { checkoutProvider, timeout, addressToBytes32 } = require("../../utils/helper");
const { ethers } = require("hardhat");
const { BigNumber } = require('ethers');
const { assert } = require('chai');

describe("E2E CurveProxy local test", () => {

    beforeEach(async () => {
        ERC20A = artifacts.require('ERC20Mock')
        ERC20B = artifacts.require('ERC20Mock')
        ERC20C = artifacts.require('ERC20Mock')

        RouterA = artifacts.require('Router')
        RouterB = artifacts.require('Router')
        RouterC = artifacts.require('Router')

        prov = process.env.SET_TEST_ENVIROMENT === 'testnet' ? { 'typenet': 'teststand', 'net1': 'mumbai', 'net2': 'harmonytestnet', 'net3': 'bsctestnet' } : { 'typenet': 'devstand', 'net1': 'network1', 'net2': 'network2', 'net3': 'network3' }
        factoryProvider = checkoutProvider(prov)
        gasAmount = process.env.SET_TEST_ENVIROMENT === 'testnet' ? 300_000 : 1000_000
        waitDuration = process.env.SET_TEST_ENVIROMENT === 'testnet' ? 65000 : 15000
        net1 = prov['net1']
        net2 = prov['net2']
        net3 = prov['net3']
        totalSupply = ethers.constants.MaxUint256

        RouterA.setProvider(factoryProvider.web3Net1)
        RouterB.setProvider(factoryProvider.web3Net2)
        RouterC.setProvider(factoryProvider.web3Net3)

        ERC20A.setProvider(factoryProvider.web3Net1)
        ERC20B.setProvider(factoryProvider.web3Net2)
        ERC20C.setProvider(factoryProvider.web3Net3)

        userNet1 = (await RouterA.web3.eth.getAccounts())[0];
        userNet2 = (await RouterB.web3.eth.getAccounts())[0];
        userNet3 = (await RouterC.web3.eth.getAccounts())[0];

        tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
        tokenA2 = await ERC20A.at(deployInfo["network1"].localToken[1].address)
        tokenA3 = await ERC20A.at(deployInfo["network1"].localToken[2].address)
        routerA = await RouterA.at(deployInfo["network1"].router)
        routerB = await RouterB.at(deployInfo["network2"].router)
        routerC = await RouterC.at(deployInfo["network3"].router)
        tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
        tokenB2 = await ERC20B.at(deployInfo["network2"].localToken[1].address)
        tokenB3 = await ERC20B.at(deployInfo["network2"].localToken[2].address)
        tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
        tokenC2 = await ERC20C.at(deployInfo["network3"].localToken[1].address)
        tokenC3 = await ERC20C.at(deployInfo["network3"].localToken[2].address)
    })

    it("Exchange: Inconsistency - expectedMinMintAmount", async function () {
        balanceC2 = await tokenC2.balanceOf(userNet3)
        

        //synthesize params
        const synthParams = {
            chain2address: deployInfo["network2"].curveProxy,
            receiveSide: deployInfo["network2"].curveProxy,
            oppositeBridge: deployInfo["network2"].bridge,
            chainId: deployInfo["network2"].chainId
        }

        const metaExchangeParams = {
            add: deployInfo["network2"].crosschainPool[0].address,            //add pool address
            exchange: deployInfo["network2"].hubPool.address,                 //exchange pool address
            remove: deployInfo["network2"].crosschainPool[1].address,         //remove pool address
            //add liquidity params
            expectedMinMintAmount: ethers.constants.MaxUint256,
            //exchange params
            i: 0,                                             //index value for the coin to send
            j: 1,                                             //index value of the coin to receive
            expectedMinDy: 0,
            //withdraw one coin params
            x: 1,                                             // index value of the coin to withdraw
            expectedMinAmount: 0,
            //mint synth params
            to: userNet3,
            //unsynth params
            chain2address: deployInfo["network3"].portal,
            receiveSide: deployInfo["network3"].portal,
            oppositeBridge: deployInfo["network3"].bridge,
            chainId: deployInfo["network3"].chainId,
        }

        const emergencyUnsynthParams = {
            initialPortal:deployInfo["network1"].portal,
            initialBridge:deployInfo["network1"].bridge,
            initialChainID:deployInfo["network1"].chainId,
            v: 0,
            r: ethers.constants.HashZero,
            s: ethers.constants.HashZero,
        }

        await tokenA1.approve(routerA.address, totalSupply, { from: userNet1, gas: 300_000 })
        const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        const testAmount = Math.floor((Math.random() * 100) + 1);
        amounts[0] = ethers.utils.parseEther(testAmount.toString() + ".0")
        const tokensToSynth = [tokenA1.address, tokenA2.address, tokenA3.address]

        await routerA.synthBatchMetaExchangeRequest(
            tokensToSynth,
            amounts,
            userNet1,
            synthParams,
            metaExchangeParams,
            emergencyUnsynthParams,
            { from: userNet1, gas: 1000_000 }
        )

        await timeout(25000)
        assert(balanceC2.eq(await tokenC2.balanceOf(userNet3)))
    })

    it("Exchange: Inconsistency - expectedMinDy", async function () {
        balanceC2 = await tokenC2.balanceOf(userNet3)
        

        //synthesize params
        const synthParams = {
            chain2address: deployInfo["network2"].curveProxy,
            receiveSide: deployInfo["network2"].curveProxy,
            oppositeBridge: deployInfo["network2"].bridge,
            chainId: deployInfo["network2"].chainId
        }

        const metaExchangeParams = {
            add: deployInfo["network2"].crosschainPool[0].address,            //add pool address
            exchange: deployInfo["network2"].hubPool.address,                 //exchange pool address
            remove: deployInfo["network2"].crosschainPool[1].address,         //remove pool address
            //add liquidity params
            expectedMinMintAmount: 0,
            //exchange params
            i: 0,                                             //index value for the coin to send
            j: 1,                                             //index value of the coin to receive
            expectedMinDy: ethers.constants.MaxUint256,
            //withdraw one coin params
            x: 1,                                             // index value of the coin to withdraw
            expectedMinAmount: 0,
            //mint synth params
            to: userNet3,
            //unsynth params
            chain2address: deployInfo["network3"].portal,
            receiveSide: deployInfo["network3"].portal,
            oppositeBridge: deployInfo["network3"].bridge,
            chainId: deployInfo["network3"].chainId,
        }

        const emergencyUnsynthParams = {
            initialPortal:deployInfo["network1"].portal,
            initialBridge:deployInfo["network1"].bridge,
            initialChainID:deployInfo["network1"].chainId,
            v: 0,
            r: ethers.constants.HashZero,
            s: ethers.constants.HashZero,
        }

        await tokenA1.approve(routerA.address, totalSupply, { from: userNet1, gas: 300_000 })
        const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        const testAmount = Math.floor((Math.random() * 100) + 1);
        amounts[0] = ethers.utils.parseEther(testAmount.toString() + ".0")
        const tokensToSynth = [tokenA1.address, tokenA2.address, tokenA3.address]

        await routerA.synthBatchMetaExchangeRequest(
            tokensToSynth,
            amounts,
            userNet1,
            synthParams,
            metaExchangeParams,
            emergencyUnsynthParams,
            { from: userNet1, gas: 1000_000 }
        )

        await timeout(25000)
        assert(balanceC2.eq(await tokenC2.balanceOf(userNet3)))
    })

    it("Exchange: Inconsistency - expectedMinAmount", async function () {
        balanceC2 = await tokenC2.balanceOf(userNet3)
        

        //synthesize params
        const synthParams = {
            chain2address: deployInfo["network2"].curveProxy,
            receiveSide: deployInfo["network2"].curveProxy,
            oppositeBridge: deployInfo["network2"].bridge,
            chainId: deployInfo["network2"].chainId
        }

        const metaExchangeParams = {
            add: deployInfo["network2"].crosschainPool[0].address,            //add pool address
            exchange: deployInfo["network2"].hubPool.address,                 //exchange pool address
            remove: deployInfo["network2"].crosschainPool[1].address,         //remove pool address
            //add liquidity params
            expectedMinMintAmount: 0,
            //exchange params
            i: 0,                                             //index value for the coin to send
            j: 1,                                             //index value of the coin to receive
            expectedMinDy: 0,
            //withdraw one coin params
            x: 1,                                             // index value of the coin to withdraw
            expectedMinAmount: ethers.constants.MaxUint256,
            //mint synth params
            to: userNet3,
            //unsynth params
            chain2address: deployInfo["network3"].portal,
            receiveSide: deployInfo["network3"].portal,
            oppositeBridge: deployInfo["network3"].bridge,
            chainId: deployInfo["network3"].chainId,
        }

        const emergencyUnsynthParams = {
            initialPortal:deployInfo["network1"].portal,
            initialBridge:deployInfo["network1"].bridge,
            initialChainID:deployInfo["network1"].chainId,
            v: 0,
            r: ethers.constants.HashZero,
            s: ethers.constants.HashZero,
        }

        await tokenA1.approve(routerA.address, totalSupply, { from: userNet1, gas: 300_000 })
        const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        const testAmount = Math.floor((Math.random() * 100) + 1);
        amounts[0] = ethers.utils.parseEther(testAmount.toString() + ".0")
        const tokensToSynth = [tokenA1.address, tokenA2.address, tokenA3.address]

        await routerA.synthBatchMetaExchangeRequest(
            tokensToSynth,
            amounts,
            userNet1,
            synthParams,
            metaExchangeParams,
            emergencyUnsynthParams,
            { from: userNet1, gas: 1000_000 }
        )

        await timeout(25000)
        assert(balanceC2.eq(await tokenC2.balanceOf(userNet3)))
    })

    it("Mint EUSD: Inconsistency - expectedMinMintAmountC", async function () {
        EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)
        balanceEUSD = await EUSD.balanceOf(userNet2)

        //synthesize params
        const synthParams = {
            chain2address: deployInfo["network2"].curveProxy,
            receiveSide: deployInfo["network2"].curveProxy,
            oppositeBridge: deployInfo["network2"].bridge,
            chainId: deployInfo["network2"].chainId
        }

        const mintEUSDparams = {
            addAtCrosschainPool: deployInfo["network2"].crosschainPool[0].address,
            //add liquidity params
            expectedMinMintAmountC: ethers.constants.MaxUint256,
            //exchange params
            lpIndex: 0,
            addAtHubPool: deployInfo["network2"].hubPool.address,
            expectedMinMintAmountH: 0,
            to: userNet2,
        }

        const emergencyUnsynthParams = {
            initialPortal:deployInfo["network1"].portal,
            initialBridge:deployInfo["network1"].bridge,
            initialChainID:deployInfo["network1"].chainId,
            v: 0,
            r: ethers.constants.HashZero,
            s: ethers.constants.HashZero,
        }

        await tokenA1.approve(routerA.address, totalSupply, { from: userNet1, gas: 300_000 })
        const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        const testAmount = Math.floor((Math.random() * 100) + 1);
        amounts[0] = ethers.utils.parseEther(testAmount.toString() + ".0")
        const tokensToSynth = [tokenA1.address, tokenA2.address, tokenA3.address]

        await routerA.synthBatchAddLiquidity3PoolMintEUSDRequest(
            tokensToSynth,
            amounts,
            userNet1,
            synthParams,
            mintEUSDparams,
            emergencyUnsynthParams,
            { from: userNet1, gas: 1000_000 }
        )

        await timeout(25000)
        assert(balanceEUSD.eq(await EUSD.balanceOf(userNet2)))
    })


    it("Mint EUSD: Inconsistency - expectedMinMintAmountH", async function () {
        EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)
        balanceEUSD = await EUSD.balanceOf(userNet2)

        //synthesize params
        const synthParams = {
            chain2address: deployInfo["network2"].curveProxy,
            receiveSide: deployInfo["network2"].curveProxy,
            oppositeBridge: deployInfo["network2"].bridge,
            chainId: deployInfo["network2"].chainId
        }

        const mintEUSDparams = {
            addAtCrosschainPool: deployInfo["network2"].crosschainPool[0].address,
            //add liquidity params
            expectedMinMintAmountC: 0,
            //exchange params
            lpIndex: 0,
            addAtHubPool: deployInfo["network2"].hubPool.address,
            expectedMinMintAmountH: ethers.constants.MaxUint256,
            to: userNet2,
        }

        const emergencyUnsynthParams = {
            initialPortal:deployInfo["network1"].portal,
            initialBridge:deployInfo["network1"].bridge,
            initialChainID:deployInfo["network1"].chainId,
            v: 0,
            r: ethers.constants.HashZero,
            s: ethers.constants.HashZero,
        }

        await tokenA1.approve(routerA.address, totalSupply, { from: userNet1, gas: 300_000 })
        const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        const testAmount = Math.floor((Math.random() * 100) + 1);
        amounts[0] = ethers.utils.parseEther(testAmount.toString() + ".0")
        const tokensToSynth = [tokenA1.address, tokenA2.address, tokenA3.address]

        await routerA.synthBatchAddLiquidity3PoolMintEUSDRequest(
            tokensToSynth,
            amounts,
            userNet1,
            synthParams,
            mintEUSDparams,
            emergencyUnsynthParams,
            { from: userNet1, gas: 1000_000 }
        )

        await timeout(25000)
        assert(balanceEUSD.eq(await EUSD.balanceOf(userNet2)))
    })

})
