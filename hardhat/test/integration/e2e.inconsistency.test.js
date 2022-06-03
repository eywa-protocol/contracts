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

        PortalA = artifacts.require('Portal')
        PortalB = artifacts.require('Portal')
        PortalC = artifacts.require('Portal')

        CurveProxyA = artifacts.require('CurveProxy');
        CurveProxyB = artifacts.require('CurveProxy');
        CurveProxyC = artifacts.require('CurveProxy');

        prov = process.env.SET_TEST_ENVIROMENT === 'testnet' ? { 'typenet': 'teststand', 'net1': 'mumbai', 'net2': 'harmonytestnet', 'net3': 'bsctestnet' } : { 'typenet': 'devstand', 'net1': 'network1', 'net2': 'network2', 'net3': 'network3' }
        factoryProvider = checkoutProvider(prov)
        gasAmount = process.env.SET_TEST_ENVIROMENT === 'testnet' ? 300_000 : 1000_000
        waitDuration = process.env.SET_TEST_ENVIROMENT === 'testnet' ? 65000 : 15000
        net1 = prov['net1']
        net2 = prov['net2']
        net3 = prov['net3']
        totalSupply = ethers.constants.MaxUint256

        CurveProxyA.setProvider(factoryProvider.web3Net1)
        CurveProxyB.setProvider(factoryProvider.web3Net2)
        CurveProxyC.setProvider(factoryProvider.web3Net3)

        ERC20A.setProvider(factoryProvider.web3Net1)
        ERC20B.setProvider(factoryProvider.web3Net2)
        ERC20C.setProvider(factoryProvider.web3Net3)

        PortalA.setProvider(factoryProvider.web3Net1)
        PortalB.setProvider(factoryProvider.web3Net2)
        PortalC.setProvider(factoryProvider.web3Net3)

        userNet1 = (await CurveProxyA.web3.eth.getAccounts())[0];
        userNet2 = (await CurveProxyB.web3.eth.getAccounts())[0];
        userNet3 = (await CurveProxyC.web3.eth.getAccounts())[0];

        amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        const testAmount = Math.floor((Math.random() * 100) + 1);
        amounts[0] = ethers.utils.parseEther(testAmount.toString() + ".0")

        tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
        tokenA2 = await ERC20A.at(deployInfo["network1"].localToken[1].address)
        tokenA3 = await ERC20A.at(deployInfo["network1"].localToken[2].address)
        portalC = await PortalC.at(deployInfo["network3"].portal)
        tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
        tokenC2 = await ERC20C.at(deployInfo["network3"].localToken[1].address)
        tokenC3 = await ERC20C.at(deployInfo["network3"].localToken[2].address)
        portalA = await PortalA.at(deployInfo["network1"].portal)
        tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
        tokenB2 = await ERC20B.at(deployInfo["network2"].localToken[1].address)
        tokenB3 = await ERC20B.at(deployInfo["network2"].localToken[2].address)
        curveProxyB = await CurveProxyB.at(deployInfo["network2"].curveProxy)
        EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)
    })

    it("Exchange: Inconsistency - min_mint_amount", async function () {
        selectorMetaExchange = web3.eth.abi.encodeFunctionSignature(
            'transiSynthBatchMetaExchange((address,address,address,uint256,int128,int128,uint256,int128,uint256,address,address,address,address,uint256,address,uint256),address[3],uint256[3],bytes32[3])'
        )

        this.balanceA2 = (await tokenA2.balanceOf(userNet1))

        //synthesize params
        const synthParams = {
            chain2address: deployInfo["network2"].curveProxy,
            receiveSide: deployInfo["network2"].curveProxy,
            oppositeBridge: deployInfo["network2"].bridge,
            chainId: deployInfo["network2"].chainId
        }

        const metaExchangeParams = {
            add: deployInfo["network2"].crosschainPool[1].address,            //add pool address
            exchange: deployInfo["network2"].hubPool.address,                 //exchange pool address
            remove: deployInfo["network2"].crosschainPool[0].address,         //remove pool address
            //add liquidity params
            expectedMinMintAmount: ethers.constants.MaxUint256,
            //exchange params
            i: 1,                                             //index value for the coin to send
            j: 0,                                             //index value of the coin to receive
            expected_min_dy: 0,
            //withdraw one coin params
            x: 1,                                             // index value of the coin to withdraw
            expected_min_amount: 0,
            //mint synth params
            to: userNet1,
            //unsynth params
            chain2address: deployInfo["network1"].portal,
            receiveSide: deployInfo["network1"].portal,
            oppositeBridge: deployInfo["network1"].bridge,
            chainId: deployInfo["network1"].chainId,
            initialBridge: deployInfo["network3"].bridge,
            initialChainID: deployInfo["network3"].chainId
        }

        const encodedTransitData = web3.eth.abi.encodeParameters(
            ['address', 'address', 'address', 'uint256', 'int128', 'int128', 'uint256', 'int128', 'uint256',
                'address', 'address', 'address', 'address', 'uint256', 'address', 'uint256'],
            [metaExchangeParams.add,
            metaExchangeParams.exchange,
            metaExchangeParams.remove,
            /////
            metaExchangeParams.expectedMinMintAmount,
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
            metaExchangeParams.chain2address,
            metaExchangeParams.receiveSide,
            metaExchangeParams.oppositeBridge,
            metaExchangeParams.chainId,
            metaExchangeParams.initialBridge,
            metaExchangeParams.initialChainID
            ]
        )

        const permitParams = new Array(3).fill({
            v: 0,
            r: ethers.constants.HashZero,
            s: ethers.constants.HashZero,
            deadline: 0,
            approveMax: false
        })

        await tokenC1.approve(portalC.address, totalSupply, { from: userNet3, gas: 300_000 })
        const tokensToSynth = [tokenC1.address, tokenC2.address, tokenC3.address]

        await portalC.synthesizeBatchWithDataTransit(
            tokensToSynth,
            amounts,
            synthParams,
            selectorMetaExchange,
            encodedTransitData,
            permitParams,
            { from: userNet3, gas: 1000_000 }
        )

        await timeout(25000)

        assert(this.balanceA2.eq(await tokenA2.balanceOf(userNet1)))
    })

    it("Exchange: Inconsistency - min_dy", async function () {
        selectorMetaExchange = web3.eth.abi.encodeFunctionSignature(
            'transiSynthBatchMetaExchange((address,address,address,uint256,int128,int128,uint256,int128,uint256,address,address,address,address,uint256,address,uint256),address[3],uint256[3],bytes32[3])'
        )

        this.balanceA2 = (await tokenA2.balanceOf(userNet1))

        //synthesize params
        const synthParams = {
            chain2address: deployInfo["network2"].curveProxy,
            receiveSide: deployInfo["network2"].curveProxy,
            oppositeBridge: deployInfo["network2"].bridge,
            chainId: deployInfo["network2"].chainId
        }

        const metaExchangeParams = {
            add: deployInfo["network2"].crosschainPool[1].address,            //add pool address
            exchange: deployInfo["network2"].hubPool.address,                 //exchange pool address
            remove: deployInfo["network2"].crosschainPool[0].address,         //remove pool address
            //add liquidity params
            expectedMinMintAmount: 0,
            //exchange params
            i: 1,                                             //index value for the coin to send
            j: 0,                                             //index value of the coin to receive
            expected_min_dy: ethers.constants.MaxUint256,
            //withdraw one coin params
            x: 1,                                             // index value of the coin to withdraw
            expected_min_amount: 0,
            //mint synth params
            to: userNet1,
            //unsynth params
            chain2address: deployInfo["network1"].portal,
            receiveSide: deployInfo["network1"].portal,
            oppositeBridge: deployInfo["network1"].bridge,
            chainId: deployInfo["network1"].chainId,
            initialBridge: deployInfo["network3"].bridge,
            initialChainID: deployInfo["network3"].chainId
        }

        const encodedTransitData = web3.eth.abi.encodeParameters(
            ['address', 'address', 'address', 'uint256', 'int128', 'int128', 'uint256', 'int128', 'uint256',
                'address', 'address', 'address', 'address', 'uint256', 'address', 'uint256'],
            [metaExchangeParams.add,
            metaExchangeParams.exchange,
            metaExchangeParams.remove,
            /////
            metaExchangeParams.expectedMinMintAmount,
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
            metaExchangeParams.chain2address,
            metaExchangeParams.receiveSide,
            metaExchangeParams.oppositeBridge,
            metaExchangeParams.chainId,
            metaExchangeParams.initialBridge,
            metaExchangeParams.initialChainID
            ]
        )

        const permitParams = new Array(3).fill({
            v: 0,
            r: ethers.constants.HashZero,
            s: ethers.constants.HashZero,
            deadline: 0,
            approveMax: false
        })

        await tokenC1.approve(portalC.address, totalSupply, { from: userNet3, gas: 300_000 })
        const tokensToSynth = [tokenC1.address, tokenC2.address, tokenC3.address]

        await portalC.synthesizeBatchWithDataTransit(
            tokensToSynth,
            amounts,
            synthParams,
            selectorMetaExchange,
            encodedTransitData,
            permitParams,
            { from: userNet3, gas: 1000_000 }
        )

        await timeout(25000)

        assert(this.balanceA2.eq(await tokenA2.balanceOf(userNet1)))
    })

    it("Exchange: Inconsistency - min_amount", async function () {
        selectorMetaExchange = web3.eth.abi.encodeFunctionSignature(
            'transiSynthBatchMetaExchange((address,address,address,uint256,int128,int128,uint256,int128,uint256,address,address,address,address,uint256,address,uint256),address[3],uint256[3],bytes32[3])'
        )

        this.balanceA2 = (await tokenA2.balanceOf(userNet1))

        //synthesize params
        const synthParams = {
            chain2address: deployInfo["network2"].curveProxy,
            receiveSide: deployInfo["network2"].curveProxy,
            oppositeBridge: deployInfo["network2"].bridge,
            chainId: deployInfo["network2"].chainId
        }

        const metaExchangeParams = {
            add: deployInfo["network2"].crosschainPool[1].address,            //add pool address
            exchange: deployInfo["network2"].hubPool.address,                 //exchange pool address
            remove: deployInfo["network2"].crosschainPool[0].address,         //remove pool address
            //add liquidity params
            expectedMinMintAmount: 0,
            //exchange params
            i: 1,                                             //index value for the coin to send
            j: 0,                                             //index value of the coin to receive
            expected_min_dy: 0,
            //withdraw one coin params
            x: 1,                                             // index value of the coin to withdraw
            expected_min_amount: ethers.constants.MaxUint256,
            //mint synth params
            to: userNet1,
            //unsynth params
            chain2address: deployInfo["network1"].portal,
            receiveSide: deployInfo["network1"].portal,
            oppositeBridge: deployInfo["network1"].bridge,
            chainId: deployInfo["network1"].chainId,
            initialBridge: deployInfo["network3"].bridge,
            initialChainID: deployInfo["network3"].chainId
        }

        const encodedTransitData = web3.eth.abi.encodeParameters(
            ['address', 'address', 'address', 'uint256', 'int128', 'int128', 'uint256', 'int128', 'uint256',
                'address', 'address', 'address', 'address', 'uint256', 'address', 'uint256'],
            [metaExchangeParams.add,
            metaExchangeParams.exchange,
            metaExchangeParams.remove,
            /////
            metaExchangeParams.expectedMinMintAmount,
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
            metaExchangeParams.chain2address,
            metaExchangeParams.receiveSide,
            metaExchangeParams.oppositeBridge,
            metaExchangeParams.chainId,
            metaExchangeParams.initialBridge,
            metaExchangeParams.initialChainID
            ]
        )

        const permitParams = new Array(3).fill({
            v: 0,
            r: ethers.constants.HashZero,
            s: ethers.constants.HashZero,
            deadline: 0,
            approveMax: false
        })

        await tokenC1.approve(portalC.address, totalSupply, { from: userNet3, gas: 300_000 })
        const tokensToSynth = [tokenC1.address, tokenC2.address, tokenC3.address]

        await portalC.synthesizeBatchWithDataTransit(
            tokensToSynth,
            amounts,
            synthParams,
            selectorMetaExchange,
            encodedTransitData,
            permitParams,
            { from: userNet3, gas: 1000_000 }
        )

        await timeout(25000)

        assert(this.balanceA2.eq(await tokenA2.balanceOf(userNet1)))
    })

    it("Mint EUSD: Inconsistency - expectedMinMintAmountC", async function () {
        selectorMintEUSD = web3.eth.abi.encodeFunctionSignature(
            'transitSynthBatchAddLiquidity3PoolMintEUSD((address,uint256,uint256,address,uint256,address,address,uint256),address[3],uint256[3],bytes32[3])'
        )

        this.balanceEUSD = (await EUSD.balanceOf(userNet2))

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
            initialBridge: deployInfo["network2"].bridge,
            initialChainID: deployInfo["network2"].chainId
        }

        const encodedTransitData = web3.eth.abi.encodeParameters(
            ["address", "uint256", "uint256", "address", "uint256", "address", "address", "uint256"],
            [mintEUSDparams.addAtCrosschainPool,
            mintEUSDparams.expectedMinMintAmountC,
            mintEUSDparams.lpIndex,
            /////
            mintEUSDparams.addAtHubPool,
            /////
            mintEUSDparams.expectedMinMintAmountH,
            mintEUSDparams.to,
            mintEUSDparams.initialBridge,
            mintEUSDparams.initialChainID
            ]
        )

        const permitParams = new Array(3).fill({
            v: 0,
            r: ethers.constants.HashZero,
            s: ethers.constants.HashZero,
            deadline: 0,
            approveMax: false
        })

        await tokenA1.approve(portalA.address, totalSupply, { from: userNet1, gas: 300_000 })
        const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        const testAmount = Math.floor((Math.random() * 100) + 1);
        amounts[0] = ethers.utils.parseEther(testAmount + ".0")
        const tokensToSynth = [tokenA1.address, tokenA2.address, tokenA3.address]

        await portalA.synthesizeBatchWithDataTransit(
            tokensToSynth,
            amounts,
            synthParams,
            selectorMintEUSD,
            encodedTransitData,
            permitParams,
            { from: userNet1, gas: 1000_000 }
        )

        await timeout(15000)
        assert(this.balanceEUSD.eq(await EUSD.balanceOf(userNet2)))
    })


    it("Mint EUSD: Inconsistency - expectedMinMintAmountH", async function () {
        selectorMintEUSD = web3.eth.abi.encodeFunctionSignature(
            'transitSynthBatchAddLiquidity3PoolMintEUSD((address,uint256,uint256,address,uint256,address,address,uint256),address[3],uint256[3],bytes32[3])'
        )

        this.balanceEUSD = (await EUSD.balanceOf(userNet2))

        //synthesize params
        const synthParams = {
            chain2address: deployInfo["network2"].curveProxy,
            receiveSide: deployInfo["network2"].curveProxy,
            oppositeBridge: deployInfo["network2"].bridge,
            chainId: deployInfo["network2"].chainId,
            initialBridge: deployInfo["network2"].bridge,
            initialChainID: deployInfo["network2"].chainId
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
            initialBridge: deployInfo["network2"].bridge,
            initialChainID: deployInfo["network2"].chainId
        }

        const encodedTransitData = web3.eth.abi.encodeParameters(
            ["address", "uint256", "uint256", "address", "uint256", "address", "address", "uint256"],
            [mintEUSDparams.addAtCrosschainPool,
            mintEUSDparams.expectedMinMintAmountC,
            mintEUSDparams.lp_index,
            /////
            mintEUSDparams.add_h,
            /////
            mintEUSDparams.expected_min_mint_amount_h,
            mintEUSDparams.to,
            mintEUSDparams.initialBridge,
            mintEUSDparams.initialChainID
            ]
        )

        const permitParams = new Array(3).fill({
            v: 0,
            r: ethers.constants.HashZero,
            s: ethers.constants.HashZero,
            deadline: 0,
            approveMax: false
        })

        await tokenA1.approve(portalA.address, totalSupply, { from: userNet1, gas: 300_000 })
        const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        const testAmount = Math.floor((Math.random() * 100) + 1);
        amounts[0] = ethers.utils.parseEther(testAmount + ".0")
        const tokensToSynth = [tokenA1.address, tokenA2.address, tokenA3.address]

        await portalA.synthesizeBatchWithDataTransit(
            tokensToSynth,
            amounts,
            synthParams,
            selectorMintEUSD,
            encodedTransitData,
            permitParams,
            { from: userNet1, gas: 1000_000 }
        )

        await timeout(15000)
        assert(this.balanceEUSD.eq(await EUSD.balanceOf(userNet2)))
    })

    it("Redeem EUSD: Inconsistecny - expectedMinAmountC", async function () {

        this.balanceA3 = (await tokenA3.balanceOf(userNet1))

        //unsynthesize params
        const unsynthParams = {
            receiveSide: deployInfo["network1"].portal,
            oppositeBridge: deployInfo["network1"].bridge,
            chainId: deployInfo["network1"].chainId
        }

        const redeemEUSDParams = {
            removeAtCrosschainPool: deployInfo["network2"].crosschainPool[0].address,
            x: 2,
            expectedMinAmountC: ethers.constants.MaxUint256,
            //expectedMinAmountC: 0,
            //hub pool params
            removeAtHubPool: deployInfo["network2"].hubPool.address,
            //amount to transfer
            tokenAmountH: 1, //test amount
            y: 0,
            expectedMinAmountH: 0,
            //recipient address
            to: userNet1
        }

        const permitParams = {
            v: 0,
            r: ethers.constants.HashZero,
            s: ethers.constants.HashZero,
            deadline: 0,
            approveMax: false
        }

        await EUSD.approve(curveProxyB.address, 0, { from: userNet2, gas: 300_000 });
        await EUSD.approve(curveProxyB.address, totalSupply, { from: userNet2, gas: 300_000 });

        await curveProxyB.redeemEUSD(
            redeemEUSDParams,
            permitParams,
            unsynthParams.receiveSide,
            unsynthParams.oppositeBridge,
            unsynthParams.chainId,
            { from: userNet2, gas: 1000_000 }
        )

        await timeout(15000)
        assert(this.balanceA3.eq(await tokenA3.balanceOf(userNet1)))
    })

    it("Redeem EUSD: Inconsistecny - expectedMinAmountH", async function () {

        this.balanceA3 = (await tokenA3.balanceOf(userNet1))

        //unsynthesize params
        const unsynthParams = {
            receiveSide: deployInfo["network1"].portal,
            oppositeBridge: deployInfo["network1"].bridge,
            chainId: deployInfo["network1"].chainId
        }

        const redeemEUSDParams = {
            removeAtCrosschainPool: deployInfo["network2"].crosschainPool[0].address,
            x: 2,
            expected_min_amount_c: 0,
            //hub pool params
            remove_h: deployInfo["network2"].hubPool.address,
            //amount to transfer
            token_amount_h: 1, //test amount
            y: 0,
            expected_min_amount_h: ethers.constants.MaxUint256,
            //recipient address
            to: userNet1
        }

        const permitParams = {
            v: 0,
            r: ethers.constants.HashZero,
            s: ethers.constants.HashZero,
            deadline: 0,
            approveMax: false
        }

        await EUSD.approve(curveProxyB.address, 0, { from: userNet2, gas: 300_000 });
        await EUSD.approve(curveProxyB.address, totalSupply, { from: userNet2, gas: 300_000 });

        await curveProxyB.redeemEUSD(
            redeemEUSDParams,
            permitParams,
            unsynthParams.receiveSide,
            unsynthParams.oppositeBridge,
            unsynthParams.chainId,
            { from: userNet2, gas: 1000_000 }
        )

        await timeout(15000)
        assert(this.balanceA3.eq(await tokenA3.balanceOf(userNet1)))
    })
})
