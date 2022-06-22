let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, timeout } = require("../../utils/helper");
const { ethers } = require("hardhat");

contract('CurveProxy', () => {

    describe("end-to-end local test", () => {

        before(async () => {
            ERC20A = artifacts.require('ERC20Mock')
            ERC20B = artifacts.require('ERC20Mock')
            ERC20C = artifacts.require('ERC20Mock')

            RouterA = artifacts.require('Router')
            RouterB = artifacts.require('Router')
            RouterC = artifacts.require('Router')

            factoryProvider = checkoutProvider({ 'typenet': 'devstand', 'net1': 'network1', 'net2': 'network2', 'net3': 'network3' })
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

        it("Exchange: network1 -> network3", async function () {

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
            assert(balanceC2.lt(await tokenC2.balanceOf(userNet3)))
        })


        it("Exchange: network3 -> network1", async function () {
            balanceA2 = (await tokenA2.balanceOf(userNet1))

            //synthesize params
            const synthParams = {
                chain2address: deployInfo["network2"].curveProxy,
                receiveSide: deployInfo["network2"].curveProxy,
                oppositeBridge: deployInfo["network2"].bridge,
                chainId: deployInfo["network2"].chainId
            }

            const metaExchangeParams = {
                add: deployInfo["network2"].crosschainPool[1].address,    //add pool address
                exchange: deployInfo["network2"].hubPool.address,         //exchange pool address
                remove: deployInfo["network2"].crosschainPool[0].address,         //remove pool address
                //add liquidity params
                expectedMinMintAmount: 0,
                //exchange params
                i: 1,                                             //index value for the coin to send
                j: 0,                                             //index value of the coin to receive
                expectedMinDy: 0,
                //withdraw one coin params
                x: 1,                                             // index value of the coin to withdraw
                expectedMinAmount: 0,
                //mint synth params
                to: userNet1,
                chain2address: deployInfo["network1"].portal,
                receiveSide: deployInfo["network1"].portal,
                oppositeBridge: deployInfo["network1"].bridge,
                chainId: deployInfo["network1"].chainId,
            }

            const emergencyUnsynthParams = {
                initialPortal:deployInfo["network3"].portal,
                initialBridge:deployInfo["network3"].bridge,
                initialChainID:deployInfo["network3"].chainId,
                v: 0,
                r: ethers.constants.HashZero,
                s: ethers.constants.HashZero,
            }

            await tokenC1.approve(routerC.address, totalSupply, { from: userNet3, gas: 300_000 })
            const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
            const testAmount = Math.floor((Math.random() * 100) + 1);
            amounts[1] = ethers.utils.parseEther(testAmount.toString() + ".0")
            const tokensToSynth = [tokenC1.address, tokenC2.address, tokenC3.address]

            await routerC.synthBatchMetaExchangeRequest(
                tokensToSynth,
                amounts,
                userNet3,
                synthParams,
                metaExchangeParams,
                emergencyUnsynthParams,
                { from: userNet3, gas: 1000_000 }
            )

            await timeout(25000)
            assert(balanceA2.lt(await tokenA2.balanceOf(userNet1)))
        })

        it("Exchange: network1 -> network2(hub)", async function () {
            balanceB2 = (await tokenB2.balanceOf(userNet2))

            //synthesize params
            const synthParams = {
                chain2address: deployInfo["network2"].curveProxy,
                receiveSide: deployInfo["network2"].curveProxy,
                oppositeBridge: deployInfo["network2"].bridge,
                chainId: deployInfo["network2"].chainId
            }

            const metaExchangeParams = {
                add: deployInfo["network2"].crosschainPool[0].address,    //add pool address
                exchange: deployInfo["network2"].hubPool.address,         //exchange pool address
                remove: deployInfo["network2"].localPool.address,         //remove pool address
                //add liquidity params
                expectedMinMintAmount: 0,
                //exchange params
                i: 0,                                             //index value for the coin to send
                j: 2,                                             //index value of the coin to receive
                expectedMinDy: 0,
                //withdraw one coin params
                x: 1,                                             // index value of the coin to withdraw
                expectedMinAmount: 0,
                //mint synth params
                to: userNet2,
                //unsynth params (empty in this case)
                chain2address: ethers.constants.AddressZero,
                receiveSide: ethers.constants.AddressZero,
                oppositeBridge: ethers.constants.AddressZero,
                chainId: 0,
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
            assert(balanceB2.lt(await tokenB2.balanceOf(userNet2)))
        })


        it("Exchange: network3 -> network2(hub)", async function () {
            balanceB2 = await tokenB2.balanceOf(userNet2)

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
                remove: deployInfo["network2"].localPool.address,         //remove pool address
                //add liquidity params
                expectedMinMintAmount: 0,
                //exchange params
                i: 0,                                             //index value for the coin to send
                j: 2,                                             //index value of the coin to receive
                expectedMinDy: 0,
                //withdraw one coin params
                x: 1,                                             // index value of the coin to withdraw
                expectedMinAmount: 0,
                //mint synth params
                to: userNet2,
                //unsynth params (empty in this case)
                chain2address: ethers.constants.AddressZero,
                receiveSide: ethers.constants.AddressZero,
                oppositeBridge: ethers.constants.AddressZero,
                chainId: 0,
            }

            const emergencyUnsynthParams = {
                initialPortal:deployInfo["network3"].portal,
                initialBridge:deployInfo["network3"].bridge,
                initialChainID:deployInfo["network3"].chainId,
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
            assert(balanceB2.lt(await tokenB2.balanceOf(userNet2)))
        })
    })
})
