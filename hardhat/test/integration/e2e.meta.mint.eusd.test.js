let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, timeout, addressToBytes32 } = require("../../utils/helper");
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

            CurveProxyB = artifacts.require('CurveProxy')

            UniswapB = artifacts.require('UniswapV2Router02')

            FactoryB = artifacts.require('UniswapV2Factory')

            factoryProvider = checkoutProvider({ 'typenet': 'devstand', 'net1': 'network1', 'net2': 'network2', 'net3': 'network3' })
            totalSupply = ethers.constants.MaxUint256

            RouterA.setProvider(factoryProvider.web3Net1)
            RouterB.setProvider(factoryProvider.web3Net2)
            RouterC.setProvider(factoryProvider.web3Net3)

            CurveProxyB.setProvider(factoryProvider.web3Net2)

            UniswapB.setProvider(factoryProvider.web3Net2)

            FactoryB.setProvider(factoryProvider.web3Net2)

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
            curveProxyB = await CurveProxyB.at(deployInfo["network2"].curveProxy)
            tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            tokenB2 = await ERC20B.at(deployInfo["network2"].localToken[1].address)
            tokenB3 = await ERC20B.at(deployInfo["network2"].localToken[2].address)
            tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
            tokenC2 = await ERC20C.at(deployInfo["network3"].localToken[1].address)
            tokenC3 = await ERC20C.at(deployInfo["network3"].localToken[2].address)
            uniswapB = await UniswapB.at(deployInfo["network2"].uniswapV2Router02)
            factoryB = await FactoryB.at(deployInfo["network2"].uniswapV2Factory)

        })

        it("Mint EUSD: network1 -> network2", async function () {
            EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)
            EYWA = await ERC20B.at(deployInfo["network2"].token[0].address)
            USDT = await ERC20B.at(deployInfo["network2"].token[1].address)
            balanceEUSD = await EUSD.balanceOf(userNet2)
            console.log((await EUSD.balanceOf(userNet2)).toString())
            console.log((await EYWA.balanceOf(userNet2)).toString())
            console.log((await USDT.balanceOf(userNet2)).toString())
            console.log(ethers.utils.parseEther("1.0"))
            console.log(await factoryB.INIT_CODE_PAIR_HASH())
            await factoryB.createPair(deployInfo["network1"].token[1].address,deployInfo["network1"].token[0].address,{ from: userNet2, gas: 1000_000 })

            await EUSD.approve(uniswapB.address,ethers.constants.MaxUint256,{ from: userNet2, gas: 1000_000 })
            await EYWA.approve(uniswapB.address,ethers.constants.MaxUint256,{ from: userNet2, gas: 1000_000 })

            await uniswapB.addLiquidity(
                deployInfo["network2"].hubPool.lp,
                deployInfo["network2"].token[0].address,
                ethers.utils.parseEther("1.0"),
                ethers.utils.parseEther("1.0"),
                1,
                1,
                userNet2,
                ethers.constants.MaxInt256,
                { from: userNet2, gas: 1000_000 }
            )
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

            const bytes32arr = new Array(3).fill(addressToBytes32(tokenA1.address))

            await routerA.synthBatchAddLiquidity3PoolMintEUSDRequest(
                tokensToSynth,
                amounts,
                userNet1,
                synthParams,
                mintEUSDparams,
                emergencyUnsynthParams,
                { from: userNet1, gas: 1000_000 }
            )

            // await curveProxyB.transitSynthBatchAddLiquidity3PoolMintEUSDSwap(
            //     mintEUSDparams,
            //     emergencyUnsynthParams,
            //     tokensToSynth,
            //     amounts,
            //     bytes32arr,
            //     {
                // amountOutMin:amounts[0],
                // desiredToken:deployInfo["network1"].token[0],
                // path:[deployInfo["network1"].token[1].address,deployInfo["network1"].token[0].address],
                // to:userNet2,
                // deadline:ethers.constants.MaxInt256,
                //     }
            //     
            //     { from: userNet2, gas: 1000_000 }
            // )

            await timeout(25000)
            console.log((await EUSD.balanceOf(userNet2)).toString())
            console.log((await EYWA.balanceOf(userNet2)).toString())
            console.log((await USDT.balanceOf(userNet2)).toString())
            assert(balanceEUSD.lt(await EUSD.balanceOf(userNet2)))
        })


        // it("Mint EUSD: network3 -> network2", async function () {
        //     EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)
        //     balanceEUSD = await EUSD.balanceOf(userNet2)

        //     //synthesize params
        //     const synthParams = {
        //         chain2address: deployInfo["network2"].curveProxy,
        //         receiveSide: deployInfo["network2"].curveProxy,
        //         oppositeBridge: deployInfo["network2"].bridge,
        //         chainId: deployInfo["network2"].chainId
        //     }

        //     const mintEUSDparams = {
        //         addAtCrosschainPool: deployInfo["network2"].crosschainPool[1].address,
        //         //add liquidity params
        //         expectedMinMintAmountC: 0,
        //         //exchange params
        //         lpIndex: 1,
        //         addAtHubPool: deployInfo["network2"].hubPool.address,
        //         expectedMinMintAmountH: 0,
        //         to: userNet2,
        //     }

        //     const emergencyUnsynthParams = {
        //         initialPortal:deployInfo["network1"].portal,
        //         initialBridge:deployInfo["network1"].bridge,
        //         initialChainID:deployInfo["network1"].chainId,
        //         v: 0,
        //         r: ethers.constants.HashZero,
        //         s: ethers.constants.HashZero,
        //     }

        //     await tokenC1.approve(routerC.address, totalSupply, { from: userNet3, gas: 300_000 })
        //     const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        //     const testAmount = Math.floor((Math.random() * 100) + 1);
        //     amounts[0] = ethers.utils.parseEther(testAmount.toString() + ".0")
        //     const tokensToSynth = [tokenC1.address, tokenC2.address, tokenC3.address]

        //     await routerC.synthBatchAddLiquidity3PoolMintEUSDRequest(
        //         tokensToSynth,
        //         amounts,
        //         userNet3,
        //         synthParams,
        //         mintEUSDparams,
        //         emergencyUnsynthParams,
        //         { from: userNet3, gas: 1000_000 }
        //     )

        //     await timeout(25000)
        //     assert(balanceEUSD.lt(await EUSD.balanceOf(userNet2)))
        // })
    })
})
