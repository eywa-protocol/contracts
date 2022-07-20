let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, timeout, addressToBytes32 } = require("../../utils/helper");
const { ethers, artifacts } = require("hardhat");

contract('CurveProxy', () => {

    describe("end-to-end local test", () => {

        before(async () => {
            ERC20A = artifacts.require('ERC20Mock')
            ERC20B = artifacts.require('ERC20Mock')
            ERC20C = artifacts.require('ERC20Mock')

            PairB = artifacts.require('UniswapV2Pair')

            UniswapRouterB = artifacts.require('UniswapV2Router02')
            UniswapFactoryB = artifacts.require('UniswapV2Factory')

            CurveProxy = artifacts.require('CurveProxy')

            RouterA = artifacts.require('Router')
            RouterB = artifacts.require('Router')
            RouterC = artifacts.require('Router')

            factoryProvider = checkoutProvider({ 'typenet': 'devstand', 'net1': 'network1', 'net2': 'network2', 'net3': 'network3' })
            totalSupply = ethers.constants.MaxUint256

            CurveProxy.setProvider(factoryProvider.web3Net2)

            UniswapRouterB.setProvider(factoryProvider.web3Net2)
            UniswapFactoryB.setProvider(factoryProvider.web3Net2)

            RouterA.setProvider(factoryProvider.web3Net1)
            RouterB.setProvider(factoryProvider.web3Net2)
            RouterC.setProvider(factoryProvider.web3Net3)

            PairB.setProvider(factoryProvider.web3Net2)

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

            EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)

            uniswapRouterB = await UniswapRouterB.at(deployInfo["network2"].uniswapV2Router02)
            uniswapFactoryB = await UniswapFactoryB.at(deployInfo["network2"].uniswapV2Factory)

            tokenToSwap = await ERC20B.at(deployInfo["network2"].token[0].address)

            //await uniswapFactoryB.createPair(tokenToSwap.address, EUSD.address, { from: userNet2, gas: 1000_000, gasLimit:1000_000 })
            //await new Promise(resolve => setTimeout(resolve, 10000));
            
            pair = await uniswapFactoryB.allPairs(0)
            console.log(pair)
            pairB = await PairB.at(pair)

            // console.log(ethers.utils.formatEther(await EUSD.balanceOf(userNet2)))
            // console.log(ethers.utils.formatEther(await tokenToSwap.balanceOf(userNet2)))
            console.log((await EUSD.balanceOf(userNet2)/Math.pow(10,18)).toString())
            console.log((await tokenToSwap.balanceOf(userNet2)/Math.pow(10,18)).toString())

            await EUSD.approve(uniswapRouterB.address, totalSupply, { from: userNet2, gas: 300_000 })
            await tokenToSwap.approve(uniswapRouterB.address, totalSupply, { from: userNet2, gas: 300_000 })

            uniswapRouterB.addLiquidity(
                deployInfo["network2"].hubPool.lp,
                deployInfo["network2"].token[0].address,
                ethers.utils.parseEther("10.0"),
                ethers.utils.parseEther("10.0"),
                1,
                1,
                userNet2,
                ethers.constants.MaxInt256,
                { from: userNet2, gas: 1000_000 }
            )
            await timeout(10000)
            console.log((await EUSD.balanceOf(userNet2)/Math.pow(10,18)).toString())
            console.log((await tokenToSwap.balanceOf(userNet2)/Math.pow(10,18)).toString())
            console.log((await pairB.balanceOf(userNet2)/Math.pow(10,18)).toString())
            // await uniswapRouterB.swapExactTokensForTokens(
            //     ethers.utils.parseEther("0.5"),
            //     ethers.utils.parseEther("0.1"),
            //     [EUSD.address,tokenToSwap.address],
            //     userNet2,
            //     ethers.constants.MaxInt256,
            //     { from: userNet2, gas: 1000_000 }
            //   )
            // await timeout(10000)
            // console.log((await EUSD.balanceOf(userNet2)/Math.pow(10,18)).toString())
            // console.log((await tokenToSwap.balanceOf(userNet2)/Math.pow(10,18)).toString())
        })

        it("Uniswap Add Liquidity: network1 -> network2", async function () {

            oldBalance = await pairB.balanceOf(userNet2)
            console.log("old EUSD",(await EUSD.balanceOf(userNet2)/Math.pow(10,18)).toString())
            console.log("old token",(await tokenToSwap.balanceOf(userNet2)/Math.pow(10,18)).toString())
            curveProxyB = await CurveProxy.at(deployInfo["network2"].curveProxy)
            console.log("CurveProxy balance ", (await EUSD.balanceOf(curveProxyB.address)).toString())
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
            const txIdMock = new Array(3).fill(addressToBytes32(deployInfo["network2"].curveProxy))
            amounts[0] = ethers.utils.parseEther("1.0")
            const tokensToSynth = [tokenA1.address, tokenA2.address, tokenA3.address]

            await curveProxyB.transitSynthBatchAddLiquidity3PoolMintEUSDAddLiquidity(
                mintEUSDparams,
                emergencyUnsynthParams,
                {
                    token:tokensToSynth,
                    amount:amounts,
                    from:userNet1,
                },
                txIdMock,
                {
                    amountOutMin:ethers.utils.parseEther("0.1"),
                    path:tokenToSwap.address,
                    to:userNet2,
                    deadline:ethers.constants.MaxInt256
                },
                { from: userNet2, gas: 1000_000 }
            )

            // await routerA.synthBatchAddLiquidity3PoolMintEUSDRequest(
            //     {   
            //         amountOutMin:ethers.utils.parseEther("0.1"),
            //         path:tokenToSwap.address,
            //         to:userNet2,
            //         deadline:ethers.constants.MaxInt256,
            //         token:tokensToSynth,
            //         amount:amounts,
            //         from:userNet1
            //     },
            //     synthParams,
            //     mintEUSDparams,
            //     emergencyUnsynthParams,
            //     { from: userNet1, gas: 1000_000 }
            // )

            await timeout(25000)
            assert(oldBalance.lt(await pairB.balanceOf(userNet2)))
        })

        it("Uniswap Add Liquidity: network3 -> network2", async function () {
            EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)
            oldBalance = await pairB.balanceOf(userNet2)

            //synthesize params
            const synthParams = {
                chain2address: deployInfo["network2"].curveProxyV2,
                receiveSide: deployInfo["network2"].curveProxyV2,
                oppositeBridge: deployInfo["network2"].bridge,
                chainId: deployInfo["network2"].chainId
            }

            const mintEUSDparams = {
                addAtCrosschainPool: deployInfo["network2"].crosschainPool[1].address,
                //add liquidity params
                expectedMinMintAmountC: 0,
                //exchange params
                lpIndex: 1,
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

            await tokenC1.approve(routerC.address, totalSupply, { from: userNet3, gas: 300_000 })
            const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
            const testAmount = Math.floor((Math.random() * 100) + 1);
            amounts[0] = ethers.utils.parseEther(testAmount.toString() + ".0")
            const tokensToSynth = [tokenC1.address, tokenC2.address, tokenC3.address]
            const txIdMock = new Array(3).fill(addressToBytes32(deployInfo["network2"].curveProxy))

            // await curveProxyB.transitSynthBatchAddLiquidity3PoolMintEUSDAddLiquidity(
            //     mintEUSDparams,
            //     emergencyUnsynthParams,
            //     tokensToSynth,
            //     amounts,
            //     txIdMock,
            //     {
            //         amountOutMin:ethers.utils.parseEther("0.1"),
            //         path:[EUSD.address,tokenToSwap.address],
            //         to:userNet2,
            //         deadline:ethers.constants.MaxInt256
            //     },
            //     { from: userNet2, gas: 1000_000 }
            // )

            await routerC.synthBatchAddLiquidity3PoolMintEUSDAddLiquidityRequest(
                {   
                    token:tokensToSynth,
                    amount:amounts,
                    from:userNet1
                },
                synthParams,
                mintEUSDparams,
                emergencyUnsynthParams,
                {
                    amountOutMin:ethers.utils.parseEther("0.1"),
                    path:tokenToSwap.address,
                    to:userNet2,
                    deadline:ethers.constants.MaxInt256
                },
                { from: userNet3, gas: 1000_000 }
            )

            await timeout(25000)
            assert(oldBalance.lt(await pairB.balanceOf(userNet2)))
        })
    })
})
