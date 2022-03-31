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

            PortalA = artifacts.require('Portal')
            PortalB = artifacts.require('Portal')
            PortalC = artifacts.require('Portal')

            SynthesisA = artifacts.require('Synthesis')
            SynthesisB = artifacts.require('Synthesis')
            SynthesisC = artifacts.require('Synthesis')

            factoryProvider = checkoutProvider({ 'typenet': 'devstand', 'net1': 'network1', 'net2': 'network2', 'net3': 'network3' })
            totalSupply = ethers.constants.MaxUint256

            RouterA.setProvider(factoryProvider.web3Net1)
            RouterB.setProvider(factoryProvider.web3Net2)
            RouterC.setProvider(factoryProvider.web3Net3)

            PortalA.setProvider(factoryProvider.web3Net1)
            PortalB.setProvider(factoryProvider.web3Net2)
            PortalC.setProvider(factoryProvider.web3Net3)

            SynthesisA.setProvider(factoryProvider.web3Net1)
            SynthesisB.setProvider(factoryProvider.web3Net2)
            SynthesisC.setProvider(factoryProvider.web3Net3)

            ERC20A.setProvider(factoryProvider.web3Net1)
            ERC20B.setProvider(factoryProvider.web3Net2)
            ERC20C.setProvider(factoryProvider.web3Net3)

            userNet1 = (await PortalA.web3.eth.getAccounts())[0];
            userNet2 = (await PortalB.web3.eth.getAccounts())[0];
            userNet3 = (await PortalC.web3.eth.getAccounts())[0];

        })


        it("Synthesize: network1 -> network2(hub)", async function () {
            // // this.portalA = await PortalA.at(deployInfo["network1"].portal)
            // // console.log(this.portalA.methods)

            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo["network1"].router)
            // this.portalA = await PortalA.at(deployInfo["network1"].portal)
            // // this.synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            // // this.bridgeB = await SynthesisB.at(deployInfo["network2"].synthesis)

            // const testAmount = Math.floor((Math.random() * 100) + 1);
            const amount = 1000//ethers.utils.parseEther("0.5")
            const executionPrice = 100//ethers.utils.parseEther("0.1")
            const tokenToSynth = this.tokenA1.address
            const receiveSideB = deployInfo["network2"].synthesis
            const oppositeBridge = deployInfo["network2"].bridge
            const chainIdA = deployInfo["network1"].chainId
            const chainIdB = deployInfo["network2"].chainId
            const userFrom = userNet1
            const userTo = userNet2
            const deadline = "10000000000000"

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })

            const workerMsgHash = web3.utils.soliditySha3(
                { type: 'uint256', value: chainIdA },
                { type: 'address', value: tokenToSynth },
                { type: 'uint256', value: executionPrice },
                { type: 'address', value: userFrom },
                { type: 'address', value: userFrom },
                { type: 'uint256', value: deadline }
            );

            const workerMsgHash1 = ethers.utils.solidityKeccak256(
                ['uint256','address','uint256','address','address','uint256'],
                [chainIdA, tokenToSynth, executionPrice, userFrom, userFrom, deadline]
            );
            console.log(await this.routerA._trustedWorker(userNet1))
            // console.log(workerMsgHash)
            // console.log(workerMsgHash1)

            // const provider = new providers.Web3Provider(userNet1);
            // [signerUserNet1] = await ethers.getSigners()
            // console.log(signerUserNet1)
            // console.log(userNet1)
            signerUserNet1 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK1)
            // [signerUserNet1] = await userNet1.connect(factoryProvider.web3Net1)
            // const workerSignature = ethers.utils.splitSignature(await web3.eth.sign(workerMsgHash, userNet1))
            const workerSignature = ethers.utils.splitSignature(await signerUserNet1.signMessage(ethers.utils.arrayify(workerMsgHash)));

            const senderMsgHash = web3.utils.soliditySha3(
                { type: 'uint8', value: workerSignature.v },
                { type: 'bytes32', value: workerSignature.r },
                { type: 'bytes32', value: workerSignature.s }

            );

            const senderSignature = ethers.utils.splitSignature(await signerUserNet1.signMessage(ethers.utils.arrayify(senderMsgHash)));

            const delegatedCallReceipt = {
                executionPrice: executionPrice,
                deadline: deadline,
                v: [workerSignature.v, senderSignature.v],
                r: [workerSignature.r, senderSignature.r],
                s: [workerSignature.s, senderSignature.s]
            }

            await this.routerA.delegatedTokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userFrom,
                {
                    to: userTo,
                    receiveSide: receiveSideB,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdB,
                },
                delegatedCallReceipt,
                { from: userNet1, gas: 1000_000 }
            )

            
            // const recoveredAddress = ethers.utils.recoverAddress(ethers.utils.arrayify(workerMsgHash), workerSignature)
            //     console.log(userNet1)
            //     console.log(recoveredAddress)

            //     let recovered = ethers.utils.verifyMessage(ethers.utils.arrayify(workerMsgHash), workerSignature);
            //     console.log(recovered === userNet1);

            // await this.routerA.tokenSynthesizeRequest(
            //     tokenToSynth,
            //     amount,
            //     userFrom,
            //     {
            //         to: userTo,
            //         receiveSide: receiveSideB,
            //         oppositeBridge: oppositeBridge,
            //         chainId: chainIdB,
            //     },
            //     { from: userNet1, gas: 1000_000 }
            // )

            // await timeout(15000)
            // this.newBalanceEUSD = await this.EUSD.balanceOf(userNet2)
            // assert(this.balanceEUSD.lt(this.newBalanceEUSD))
        })















        // it("Mint EUSD: network3 -> network2(hub)", async function () {
        //     selectorMintEUSD = web3.eth.abi.encodeFunctionSignature(
        //         'transitSynthBatchAddLiquidity3PoolMintEUSD((address,uint256,uint256,address,uint256,address,address,uint256),address[3],uint256[3],bytes32[3])'
        //     )

        //     this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
        //     this.tokenC2 = await ERC20C.at(deployInfo["network3"].localToken[1].address)
        //     this.tokenC3 = await ERC20C.at(deployInfo["network3"].localToken[2].address)
        //     this.portalC = await PortalC.at(deployInfo["network3"].portal)
        //     this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
        //     this.tokenB2 = await ERC20B.at(deployInfo["network2"].localToken[1].address)
        //     this.tokenB3 = await ERC20B.at(deployInfo["network2"].localToken[2].address)
        //     this.EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)

        //     this.balanceEUSD = await this.EUSD.balanceOf(userNet2)

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
        //         initialBridge:deployInfo["network3"].bridge,
        //         initialChainID:deployInfo["network3"].chainId
        //     }

        //     const encodedTransitData = web3.eth.abi.encodeParameters(
        //         ["address", "uint256", "uint256", "address", "uint256", "address","address","uint256"],
        //         [mintEUSDparams.addAtCrosschainPool,
        //         mintEUSDparams.expectedMinMintAmountC,
        //         mintEUSDparams.lpIndex,
        //         /////
        //         mintEUSDparams.addAtHubPool,
        //         /////
        //         mintEUSDparams.expectedMinMintAmountH,
        //         mintEUSDparams.to,
        //         mintEUSDparams.initialBridge,
        //         mintEUSDparams.initialChainID
        //         ]
        //     )

        //     //unused in this case
        //     const permitParams = new Array(3).fill({
        //         v: 0,
        //         r: ethers.constants.HashZero,
        //         s: ethers.constants.HashZero,
        //         deadline: 0,
        //         approveMax: false
        //     })

        //     await this.tokenC1.approve(this.portalC.address, totalSupply, { from: userNet3, gas: 300_000 })
        //     const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        //     const testAmount = Math.floor((Math.random() * 100) + 1);
        //     amounts[0] = ethers.utils.parseEther(testAmount + ".0")
        //     const tokensToSynth = [this.tokenC1.address, this.tokenC2.address, this.tokenC3.address]

        //     await this.portalC.synthesize_batch_transit(
        //         tokensToSynth,
        //         amounts,
        //         synthParams,
        //         selectorMintEUSD,
        //         encodedTransitData,
        //         permitParams,
        //         { from: userNet3, gas: 1000_000 }
        //     )

        //     await timeout(15000)
        //     this.newBalanceEUSD = await this.EUSD.balanceOf(userNet2)
        //     assert(this.balanceEUSD.lt(this.newBalanceEUSD))
        // })

        // it("Mint EUSD: network2(hub) -> network2(hub)", async function () {

        //     this.curveproxyB = await CurveProxyB.at(deployInfo["network2"].curveProxy)
        //     this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
        //     this.tokenB2 = await ERC20B.at(deployInfo["network2"].localToken[1].address)
        //     this.tokenB3 = await ERC20B.at(deployInfo["network2"].localToken[2].address)
        //     this.EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)

        //     this.balanceEUSD = await this.EUSD.balanceOf(userNet2)

        //     const mintEUSDparams = {
        //         addAtCrosschainPool: deployInfo["network2"].localPool.address,
        //         //add liquidity params
        //         expectedMinMintAmountC: 0,
        //         //exchange params
        //         lpIndex: 2,
        //         addAtHubPool: deployInfo["network2"].hubPool.address,
        //         expectedMinMintAmountH: 0,
        //         to: userNet2,
        //         initialBridge:deployInfo["network2"].bridge,
        //         initialChainID:deployInfo["network2"].chainId
        //     }

        //     //unused in this case
        //     const permitParams = new Array(3).fill({
        //         v: 0,
        //         r: ethers.constants.HashZero,
        //         s: ethers.constants.HashZero,
        //         deadline: 0,
        //         approveMax: false
        //     })

        //     await this.tokenB1.approve(this.curveproxyB.address, 0, { from: userNet2, gas: 300_000 });
        //     await this.tokenB1.approve(this.curveproxyB.address, totalSupply, { from: userNet2, gas: 300_000 });
        //     const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        //     const testAmount = Math.floor((Math.random() * 100) + 1).toString();
        //     amounts[0] = ethers.utils.parseEther(testAmount + ".0")
        //     const tokensToTransfer = [this.tokenB1.address, this.tokenB2.address, this.tokenB3.address]

        //     await this.curveproxyB.addLiquidity3PoolMintEUSD(
        //         mintEUSDparams,
        //         permitParams,
        //         tokensToTransfer,
        //         amounts,
        //         { from: userNet2, gas: 1000_000 }
        //     )

        //     await timeout(15000)
        //     this.newBalanceEUSD = await this.EUSD.balanceOf(userNet2)
        //     assert(this.balanceEUSD.lt(this.newBalanceEUSD))
        // })


        // it("Redeem EUSD: network2(hub) -> network1", async function () {

        //     this.curveProxyB = await CurveProxyB.at(deployInfo["network2"].curveProxy)
        //     this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
        //     this.tokenA2 = await ERC20A.at(deployInfo["network1"].localToken[1].address)
        //     this.tokenA3 = await ERC20A.at(deployInfo["network1"].localToken[2].address)
        //     this.EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)

        //     this.balanceA3 = await this.tokenA3.balanceOf(userNet1)

        //     //unsynthesize params
        //     const unsynthParams = {
        //         receiveSide: deployInfo["network1"].portal,
        //         oppositeBridge: deployInfo["network1"].bridge,
        //         chainId: deployInfo["network1"].chainId
        //     }

        //     const redeemEUSDParams = {
        //         removeAtCrosschainPool: deployInfo["network2"].crosschainPool[0].address,
        //         x: 2,
        //         expectedMinAmountC: 0,
        //         //hub pool params
        //         removeAtHubPool: deployInfo["network2"].hubPool.address,
        //         //amount to transfer
        //         tokenAmountH: ethers.utils.parseEther(Math.floor((Math.random() * 10) + 1) + ".0"), //test amount
        //         y: 0,
        //         expectedMinAmountH: 0,
        //         //recipient address
        //         to: userNet1
        //     }

        //     //unused in this case
        //     const permitParams = {
        //         v: 0,
        //         r: ethers.constants.HashZero,
        //         s: ethers.constants.HashZero,
        //         deadline: 0,
        //         approveMax: false
        //     }

        //     await this.EUSD.approve(this.curveProxyB.address, 0, { from: userNet2, gas: 300_000 });
        //     await this.EUSD.approve(this.curveProxyB.address, totalSupply, { from: userNet2, gas: 300_000 });

        //     await this.curveProxyB.redeemEUSD(
        //         redeemEUSDParams,
        //         permitParams,
        //         unsynthParams.receiveSide,
        //         unsynthParams.oppositeBridge,
        //         unsynthParams.chainId,
        //         { from: userNet2, gas: 1000_000 }
        //     )

        //     await timeout(15000)
        //     assert(this.balanceA3.lt(await this.tokenA3.balanceOf(userNet1)))
        // })

        // it("Redeem EUSD: network2(hub) -> network3", async function () {
        //     this.curveProxyB = await CurveProxyB.at(deployInfo["network2"].curveProxy)
        //     this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
        //     this.tokenC2 = await ERC20C.at(deployInfo["network3"].localToken[1].address)
        //     this.tokenC3 = await ERC20C.at(deployInfo["network3"].localToken[2].address)
        //     this.EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)

        //     this.balanceC3 = await this.tokenC3.balanceOf(userNet3)

        //     //unsynthesize params
        //     const unsynthParams = {
        //         receiveSide: deployInfo["network3"].portal,
        //         oppositeBridge: deployInfo["network3"].bridge,
        //         chainId: deployInfo["network3"].chainId
        //     }

        //     const redeemEUSDParams = {
        //         removeAtCrosschainPool: deployInfo["network2"].crosschainPool[1].address,
        //         x: 2,
        //         expectedMinAmountC: 0,
        //         //hub pool params
        //         removeAtHubPool: deployInfo["network2"].hubPool.address,
        //         //amount to transfer
        //         tokenAmountH: ethers.utils.parseEther(Math.floor((Math.random() * 10) + 1) + ".0"), //test amount
        //         y: 1,
        //         expectedMinAmountH: 0,
        //         //recipient address
        //         to: userNet3
        //     }

        //     //unused in this case
        //     const permitParams = {
        //         v: 0,
        //         r: ethers.constants.HashZero,
        //         s: ethers.constants.HashZero,
        //         deadline: 0,
        //         approveMax: false
        //     }

        //     await this.EUSD.approve(this.curveProxyB.address, 0, { from: userNet2, gas: 300_000 });
        //     await this.EUSD.approve(this.curveProxyB.address, totalSupply, { from: userNet2, gas: 300_000 });

        //     await this.curveProxyB.redeemEUSD(
        //         redeemEUSDParams,
        //         permitParams,
        //         unsynthParams.receiveSide,
        //         unsynthParams.oppositeBridge,
        //         unsynthParams.chainId,
        //         { from: userNet2, gas: 1000_000 }
        //     )

        //     await timeout(15000)
        //     assert(this.balanceC3.lt(await this.tokenC3.balanceOf(userNet3)))
        // })

        // it("Redeem EUSD: network2(hub) -> network2(hub)", async function () {
        //     this.curveProxyB = await CurveProxyB.at(deployInfo["network2"].curveProxy)
        //     this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
        //     this.tokenB2 = await ERC20B.at(deployInfo["network2"].localToken[1].address)
        //     this.tokenB3 = await ERC20B.at(deployInfo["network2"].localToken[2].address)
        //     this.EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)

        //     this.balanceB3 = await this.tokenB3.balanceOf(userNet2)

        //     //unsynthesize params (empty in this case)
        //     const unsynthParams = {
        //         receiveSide: ethers.constants.AddressZero,
        //         oppositeBridge: ethers.constants.AddressZero,
        //         chainId: 0
        //     }

        //     //unused in this case
        //     const permitParams = {
        //         v: 0,
        //         r: ethers.constants.HashZero,
        //         s: ethers.constants.HashZero,
        //         deadline: 0,
        //         approveMax: false
        //     }

        //     const redeemEUSDParams = {
        //         removeAtCrosschainPool: deployInfo["network2"].localPool.address,
        //         x: 2,
        //         expectedMinAmountC: 0,
        //         //hub pool params
        //         removeAtHubPool: deployInfo["network2"].hubPool.address,
        //         //amount to transfer
        //         tokenAmountH: ethers.utils.parseEther(Math.floor((Math.random() * 10) + 1) + ".0"), //test amount
        //         y: 2,
        //         expectedMinAmountH: 0,
        //         //recipient address
        //         to: userNet2
        //     }

        //     await this.EUSD.approve(this.curveProxyB.address, 0, { from: userNet2, gas: 300_000 });
        //     await this.EUSD.approve(this.curveProxyB.address, totalSupply, { from: userNet2, gas: 300_000 });

        //     await this.curveProxyB.redeemEUSD(
        //         redeemEUSDParams,
        //         permitParams,
        //         unsynthParams.receiveSide,
        //         unsynthParams.oppositeBridge,
        //         unsynthParams.chainId,
        //         { from: userNet2, gas: 1000_000 }
        //     )

        //     await timeout(15000)
        //     assert(this.balanceB3.lt(await this.tokenB3.balanceOf(userNet2)))
        // })

        // it("Exchange: network1 -> network3", async function () {
        //     selectorMetaExchange = web3.eth.abi.encodeFunctionSignature(
        //         'transiSynthBatchMetaExchange((address,address,address,uint256,int128,int128,uint256,int128,uint256,address,address,address,address,uint256,address,uint256),address[3],uint256[3],bytes32[3])'
        //     )

        //     this.curveProxyA = await CurveProxyA.at(deployInfo["network1"].curveProxy)
        //     this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
        //     this.tokenA2 = await ERC20A.at(deployInfo["network1"].localToken[1].address)
        //     this.tokenA3 = await ERC20A.at(deployInfo["network1"].localToken[2].address)
        //     this.portalA = await PortalA.at(deployInfo["network1"].portal)
        //     this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
        //     this.tokenC2 = await ERC20C.at(deployInfo["network3"].localToken[1].address)
        //     this.tokenC3 = await ERC20C.at(deployInfo["network3"].localToken[2].address)

        //     this.balanceC2 = await this.tokenC2.balanceOf(userNet3)

        //     //synthesize params
        //     const synthParams = {
        //         chain2address: deployInfo["network2"].curveProxy,
        //         receiveSide: deployInfo["network2"].curveProxy,
        //         oppositeBridge: deployInfo["network2"].bridge,
        //         chainId: deployInfo["network2"].chainId
        //     }

        //     const metaExchangeParams = {
        //         add: deployInfo["network2"].crosschainPool[0].address,            //add pool address
        //         exchange: deployInfo["network2"].hubPool.address,                 //exchange pool address
        //         remove: deployInfo["network2"].crosschainPool[1].address,         //remove pool address
        //         //add liquidity params
        //         expectedMinMintAmount: 0,
        //         //exchange params
        //         i: 0,                                             //index value for the coin to send
        //         j: 1,                                             //index value of the coin to receive
        //         expected_min_dy: 0,
        //         //withdraw one coin params
        //         x: 1,                                             // index value of the coin to withdraw
        //         expected_min_amount: 0,
        //         //mint synth params
        //         to: userNet3,
        //         //unsynth params
        //         chain2address: deployInfo["network3"].portal,
        //         receiveSide: deployInfo["network3"].portal,
        //         oppositeBridge: deployInfo["network3"].bridge,
        //         chainId: deployInfo["network3"].chainId,
        //         initialBridge:deployInfo["network1"].bridge,
        //         initialChainID:deployInfo["network1"].chainId
        //     }

        //     const encodedTransitData = web3.eth.abi.encodeParameters(
        //         ['address', 'address', 'address', 'uint256', 'int128', 'int128', 'uint256', 'int128', 'uint256',
        //          'address', 'address', 'address', 'address', 'uint256','address','uint256'],
        //         [metaExchangeParams.add,
        //         metaExchangeParams.exchange,
        //         metaExchangeParams.remove,
        //         /////
        //         metaExchangeParams.expectedMinMintAmount,
        //         /////
        //         metaExchangeParams.i,
        //         metaExchangeParams.j,
        //         metaExchangeParams.expected_min_dy,
        //         /////
        //         metaExchangeParams.x,
        //         metaExchangeParams.expected_min_amount,
        //         /////
        //         metaExchangeParams.to,
        //         /////
        //         metaExchangeParams.chain2address,
        //         metaExchangeParams.receiveSide,
        //         metaExchangeParams.oppositeBridge,
        //         metaExchangeParams.chainId,
        //         metaExchangeParams.initialBridge,
        //         metaExchangeParams.initialChainID
        //         ]
        //     )

        //     //unused in this case
        //     const permitParams = new Array(3).fill({
        //         v: 0,
        //         r: ethers.constants.HashZero,
        //         s: ethers.constants.HashZero,
        //         deadline: 0,
        //         approveMax: false
        //     })

        //     await this.tokenA1.approve(this.portalA.address, totalSupply, { from: userNet1, gas: 300_000 })
        //     const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        //     const testAmount = Math.floor((Math.random() * 100) + 1);
        //     amounts[0] = ethers.utils.parseEther(testAmount.toString() + ".0")
        //     const tokensToSynth = [this.tokenA1.address, this.tokenA2.address, this.tokenA3.address]

        //     await this.portalA.synthesize_batch_transit(
        //         tokensToSynth,
        //         amounts,
        //         synthParams,
        //         selectorMetaExchange,
        //         encodedTransitData,
        //         permitParams,
        //         { from: userNet1, gas: 1000_000 }
        //     )

        //     await timeout(25000)
        //     assert(this.balanceC2.lt(await this.tokenC2.balanceOf(userNet3)))
        // })


        // it("Exchange: network3 -> network1", async function () {
        //     selectorMetaExchange = web3.eth.abi.encodeFunctionSignature(
        //         'transiSynthBatchMetaExchange((address,address,address,uint256,int128,int128,uint256,int128,uint256,address,address,address,address,uint256,address,uint256),address[3],uint256[3],bytes32[3])'
        //     )

        //     this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
        //     this.tokenA2 = await ERC20A.at(deployInfo["network1"].localToken[1].address)
        //     this.tokenA3 = await ERC20A.at(deployInfo["network1"].localToken[2].address)
        //     this.portalC = await PortalC.at(deployInfo["network3"].portal)
        //     this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
        //     this.tokenC2 = await ERC20C.at(deployInfo["network3"].localToken[1].address)
        //     this.tokenC3 = await ERC20C.at(deployInfo["network3"].localToken[2].address)

        //     this.balanceA2 = await this.tokenA2.balanceOf(userNet1)

        //     //synthesize params
        //     const synthParams = {
        //         chain2address: deployInfo["network2"].curveProxy,
        //         receiveSide: deployInfo["network2"].curveProxy,
        //         oppositeBridge: deployInfo["network2"].bridge,
        //         chainId: deployInfo["network2"].chainId
        //     }

        //     const metaExchangeParams = {
        //         add: deployInfo["network2"].crosschainPool[1].address,            //add pool address
        //         exchange: deployInfo["network2"].hubPool.address,                 //exchange pool address
        //         remove: deployInfo["network2"].crosschainPool[0].address,         //remove pool address
        //         //add liquidity params
        //         expectedMinMintAmount: 0,
        //         //exchange params
        //         i: 1,                                             //index value for the coin to send
        //         j: 0,                                             //index value of the coin to receive
        //         expected_min_dy: 0,
        //         //withdraw one coin params
        //         x: 1,                                             // index value of the coin to withdraw
        //         expected_min_amount: 0,
        //         //mint synth params
        //         to: userNet1,
        //         //unsynth params
        //         chain2address: deployInfo["network1"].portal,
        //         receiveSide: deployInfo["network1"].portal,
        //         oppositeBridge: deployInfo["network1"].bridge,
        //         chainId: deployInfo["network1"].chainId,
        //         initialBridge:deployInfo["network3"].bridge,
        //         initialChainID:deployInfo["network3"].chainId
        //     }

        //     //unused in this case
        //     const permitParams = new Array(3).fill({
        //         v: 0,
        //         r: ethers.constants.HashZero,
        //         s: ethers.constants.HashZero,
        //         deadline: 0,
        //         approveMax: false
        //     })

        //     const encodedTransitData = web3.eth.abi.encodeParameters(
        //         ['address', 'address', 'address', 'uint256', 'int128', 'int128', 'uint256', 'int128', 'uint256',
        //          'address', 'address', 'address', 'address', 'uint256','address','uint256'],
        //         [metaExchangeParams.add,
        //         metaExchangeParams.exchange,
        //         metaExchangeParams.remove,
        //         /////
        //         metaExchangeParams.expectedMinMintAmount,
        //         /////
        //         metaExchangeParams.i,
        //         metaExchangeParams.j,
        //         metaExchangeParams.expected_min_dy,
        //         /////
        //         metaExchangeParams.x,
        //         metaExchangeParams.expected_min_amount,
        //         /////permitParams
        //         metaExchangeParams.to,
        //         /////
        //         metaExchangeParams.chain2address,
        //         metaExchangeParams.receiveSide,
        //         metaExchangeParams.oppositeBridge,
        //         metaExchangeParams.chainId,
        //         metaExchangeParams.initialBridge,
        //         metaExchangeParams.initialChainID
        //         ]
        //     )

        //     await this.tokenC1.approve(this.portalC.address, totalSupply, { from: userNet3, gas: 300_000 })
        //     const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        //     const testAmount = Math.floor((Math.random() * 100) + 1);
        //     amounts[0] = ethers.utils.parseEther(testAmount.toString() + ".0")
        //     const tokensToSynth = [this.tokenC1.address, this.tokenC2.address, this.tokenC3.address]

        //     await this.portalC.synthesize_batch_transit(
        //         tokensToSynth,
        //         amounts,
        //         synthParams,
        //         selectorMetaExchange,
        //         encodedTransitData,
        //         permitParams,
        //         { from: userNet3, gas: 1000_000 }
        //     )

        //     await timeout(25000)
        //     assert(this.balanceA2.lt(await this.tokenA2.balanceOf(userNet1)))
        // })


        // it("Exchange: network2(hub) -> network1", async function () {

        //     this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
        //     this.tokenA2 = await ERC20A.at(deployInfo["network1"].localToken[1].address)
        //     this.tokenA3 = await ERC20A.at(deployInfo["network1"].localToken[2].address)
        //     this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
        //     this.tokenB2 = await ERC20B.at(deployInfo["network2"].localToken[1].address)
        //     this.tokenB3 = await ERC20B.at(deployInfo["network2"].localToken[2].address)
        //     this.curveProxyB = await CurveProxyB.at(deployInfo["network2"].curveProxy)

        //     this.balanceA2 = (await this.tokenA2.balanceOf(userNet1))

        //     const metaExchangeParams = {
        //         add: deployInfo["network2"].localPool.address,
        //         exchange: deployInfo["network2"].hubPool.address,                 //exchange pool address
        //         remove: deployInfo["network2"].crosschainPool[0].address,         //remove pool address
        //         //add liquidity params
        //         expectedMinMintAmount: 0,
        //         //exchange params
        //         i: 2,                                             //index value for the coin to send
        //         j: 0,                                             //index value of the coin to receive
        //         expected_min_dy: 0,
        //         //withdraw one coin params
        //         x: 1,                                             // index value of the coin to withdraw
        //         expected_min_amount: 0,
        //         //mint synth params
        //         to: userNet1,
        //         //unsynth params
        //         chain2address: deployInfo["network1"].portal,
        //         receiveSide: deployInfo["network1"].portal,
        //         oppositeBridge: deployInfo["network1"].bridge,
        //         chainId: deployInfo["network1"].chainId,
        //         initialBridge:deployInfo["network2"].bridge,
        //         initialChainID:deployInfo["network2"].chainId
        //     }

        //     //unused in this case
        //     const permitParams = new Array(3).fill({
        //         v: 0,
        //         r: ethers.constants.HashZero,
        //         s: ethers.constants.HashZero,
        //         deadline: 0,
        //         approveMax: false
        //     })

        //     await this.tokenB1.approve(this.curveProxyB.address, totalSupply, { from: userNet2, gas: 300_000 })
        //     const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        //     const testAmount = Math.floor((Math.random() * 100) + 1);
        //     amounts[0] = ethers.utils.parseEther(testAmount + ".0")
        //     const tokens = [this.tokenB1.address, this.tokenB2.address, this.tokenB3.address]

        //     await this.curveProxyB.metaExchange(
        //         metaExchangeParams,
        //         permitParams,
        //         tokens,
        //         amounts,
        //         { from: userNet2, gas: 1000_000 }
        //     )
        //     await timeout(25000)
        //     assert(this.balanceA2.lt(await this.tokenA2.balanceOf(userNet1)))
        // })

        // it("Exchange: network2(hub) -> network3", async function () {
        //     this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
        //     this.tokenC2 = await ERC20C.at(deployInfo["network3"].localToken[1].address)
        //     this.tokenC3 = await ERC20C.at(deployInfo["network3"].localToken[2].address)
        //     this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
        //     this.tokenB2 = await ERC20B.at(deployInfo["network2"].localToken[1].address)
        //     this.tokenB3 = await ERC20B.at(deployInfo["network2"].localToken[2].address)
        //     this.curveProxyB = await CurveProxyB.at(deployInfo["network2"].curveProxy)

        //     this.balanceC2 = (await this.tokenC2.balanceOf(userNet3))

        //     const metaExchangeParams = {
        //         add: deployInfo["network2"].localPool.address,
        //         exchange: deployInfo["network2"].hubPool.address,           //exchange pool address
        //         remove: deployInfo["network2"].crosschainPool[1].address,   //remove pool address
        //         //add liquidity params
        //         expectedMinMintAmount: 0,
        //         //exchange params
        //         i: 2,                                             //index value for the coin to send
        //         j: 1,                                             //index value of the coin to receive
        //         expected_min_dy: 0,
        //         //withdraw one coin params
        //         x: 1,                                             // index value of the coin to withdraw
        //         expected_min_amount: 0,
        //         //mint synth params
        //         to: userNet3,
        //         //unsynth params
        //         chain2address: deployInfo["network3"].portal,
        //         receiveSide: deployInfo["network3"].portal,
        //         oppositeBridge: deployInfo["network3"].bridge,
        //         chainId: deployInfo["network3"].chainId,
        //         initialBridge:deployInfo["network2"].bridge,
        //         initialChainID:deployInfo["network2"].chainId
        //     }

        //     //unused in this case
        //     const permitParams = new Array(3).fill({
        //         v: 0,
        //         r: ethers.constants.HashZero,
        //         s: ethers.constants.HashZero,
        //         deadline: 0,
        //         approveMax: false
        //     })

        //     await this.tokenB1.approve(this.curveProxyB.address, totalSupply, { from: userNet2, gas: 300_000 })
        //     const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        //     const testAmount = Math.floor((Math.random() * 100) + 1);
        //     amounts[0] = ethers.utils.parseEther(testAmount + ".0")
        //     const tokens = [this.tokenB1.address, this.tokenB2.address, this.tokenB3.address]

        //     await this.curveProxyB.metaExchange(
        //         metaExchangeParams,
        //         permitParams,
        //         tokens,
        //         amounts,
        //         { from: userNet2, gas: 1000_000 }
        //     )
        //     await timeout(25000)
        //     assert(this.balanceC2.lt(await this.tokenC2.balanceOf(userNet3)))
        // })

        // it("Exchange: network1 -> network2(hub)", async function () {
        //     selectorMetaExchange = web3.eth.abi.encodeFunctionSignature(
        //         'transiSynthBatchMetaExchange((address,address,address,uint256,int128,int128,uint256,int128,uint256,address,address,address,address,uint256,address,uint256),address[3],uint256[3],bytes32[3])'
        //     )

        //     this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
        //     this.tokenA2 = await ERC20A.at(deployInfo["network1"].localToken[1].address)
        //     this.tokenA3 = await ERC20A.at(deployInfo["network1"].localToken[2].address)
        //     this.portalA = await PortalA.at(deployInfo["network1"].portal)
        //     this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
        //     this.tokenB2 = await ERC20B.at(deployInfo["network2"].localToken[1].address)
        //     this.tokenB3 = await ERC20B.at(deployInfo["network2"].localToken[2].address)

        //     this.balanceB2 = (await this.tokenB2.balanceOf(userNet2))

        //     //synthesize params
        //     const synthParams = {
        //         chain2address: deployInfo["network2"].curveProxy,
        //         receiveSide: deployInfo["network2"].curveProxy,
        //         oppositeBridge: deployInfo["network2"].bridge,
        //         chainId: deployInfo["network2"].chainId
        //     }

        //     const metaExchangeParams = {
        //         add: deployInfo["network2"].crosschainPool[0].address,    //add pool address
        //         exchange: deployInfo["network2"].hubPool.address,         //exchange pool address
        //         remove: deployInfo["network2"].localPool.address,         //remove pool address
        //         //add liquidity params
        //         expectedMinMintAmount: 0,
        //         //exchange params
        //         i: 0,                                             //index value for the coin to send
        //         j: 2,                                             //index value of the coin to receive
        //         expected_min_dy: 0,
        //         //withdraw one coin params
        //         x: 1,                                             // index value of the coin to withdraw
        //         expected_min_amount: 0,
        //         //mint synth params
        //         to: userNet2,
        //         //unsynth params (empty in this case)
        //         chain2address: ethers.constants.AddressZero,
        //         receiveSide: ethers.constants.AddressZero,
        //         oppositeBridge: ethers.constants.AddressZero,
        //         chainId: 0,
        //         initialBridge:deployInfo["network1"].bridge,
        //         initialChainID:deployInfo["network1"].chainId
        //     }

        //     //unused in this case
        //     const permitParams = new Array(3).fill({
        //         v: 0,
        //         r: ethers.constants.HashZero,
        //         s: ethers.constants.HashZero,
        //         deadline: 0,
        //         approveMax: false
        //     })

        //     const encodedTransitData = web3.eth.abi.encodeParameters(
        //         ['address', 'address', 'address', 'uint256', 'int128', 'int128', 'uint256', 'int128', 'uint256',
        //          'address', 'address', 'address', 'address', 'uint256','address','uint256'],
        //         [metaExchangeParams.add,
        //         metaExchangeParams.exchange,
        //         metaExchangeParams.remove,
        //         /////
        //         metaExchangeParams.expectedMinMintAmount,
        //         /////
        //         metaExchangeParams.i,
        //         metaExchangeParams.j,
        //         metaExchangeParams.expected_min_dy,
        //         /////
        //         metaExchangeParams.x,
        //         metaExchangeParams.expected_min_amount,
        //         /////
        //         metaExchangeParams.to,
        //         /////
        //         metaExchangeParams.chain2address,
        //         metaExchangeParams.receiveSide,
        //         metaExchangeParams.oppositeBridge,
        //         metaExchangeParams.chainId,
        //         metaExchangeParams.initialBridge,
        //         metaExchangeParams.initialChainID
        //         ]
        //     )

        //     await this.tokenA1.approve(this.portalA.address, totalSupply, { from: userNet1, gas: 300_000 })
        //     const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        //     const testAmount = Math.floor((Math.random() * 100) + 1);
        //     amounts[0] = ethers.utils.parseEther(testAmount.toString() + ".0")
        //     const tokensToSynth = [this.tokenA1.address, this.tokenA2.address, this.tokenA3.address]

        //     await this.portalA.synthesize_batch_transit(
        //         tokensToSynth,
        //         amounts,
        //         synthParams,
        //         selectorMetaExchange,
        //         encodedTransitData,
        //         permitParams,
        //         { from: userNet1, gas: 1000_000 }
        //     )

        //     await timeout(25000)
        //     assert(this.balanceB2.lt(await this.tokenB2.balanceOf(userNet2)))
        // })


        // it("Exchange: network3 -> network2(hub)", async function () {
        //     selectorMetaExchange = web3.eth.abi.encodeFunctionSignature(
        //         'transiSynthBatchMetaExchange((address,address,address,uint256,int128,int128,uint256,int128,uint256,address,address,address,address,uint256,address,uint256),address[3],uint256[3],bytes32[3])'
        //     )

        //     this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
        //     this.tokenC2 = await ERC20C.at(deployInfo["network3"].localToken[1].address)
        //     this.tokenC3 = await ERC20C.at(deployInfo["network3"].localToken[2].address)
        //     this.portalA = await PortalA.at(deployInfo["network1"].portal)
        //     this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
        //     this.tokenB2 = await ERC20B.at(deployInfo["network2"].localToken[1].address)
        //     this.tokenB3 = await ERC20B.at(deployInfo["network2"].localToken[2].address)

        //     this.balanceB2 = await this.tokenB2.balanceOf(userNet2)

        //     //synthesize params
        //     const synthParams = {
        //         chain2address: deployInfo["network2"].curveProxy,
        //         receiveSide: deployInfo["network2"].curveProxy,
        //         oppositeBridge: deployInfo["network2"].bridge,
        //         chainId: deployInfo["network2"].chainId
        //     }

        //     const metaExchangeParams = {
        //         add: deployInfo["network2"].crosschainPool[0].address,            //add pool address
        //         exchange: deployInfo["network2"].hubPool.address,                 //exchange pool address
        //         remove: deployInfo["network2"].localPool.address,         //remove pool address
        //         //add liquidity params
        //         expectedMinMintAmount: 0,
        //         //exchange params
        //         i: 0,                                             //index value for the coin to send
        //         j: 2,                                             //index value of the coin to receive
        //         expected_min_dy: 0,
        //         //withdraw one coin params
        //         x: 1,                                             // index value of the coin to withdraw
        //         expected_min_amount: 0,
        //         //mint synth params
        //         to: userNet2,
        //         //unsynth params (empty in this case)
        //         chain2address: ethers.constants.AddressZero,
        //         receiveSide: ethers.constants.AddressZero,
        //         oppositeBridge: ethers.constants.AddressZero,
        //         chainId: 0,
        //         initialBridge:deployInfo["network3"].bridge,
        //         initialChainID:deployInfo["network3"].chainId
        //     }

        //     //unused in this case
        //     const permitParams = new Array(3).fill({
        //         v: 0,
        //         r: ethers.constants.HashZero,
        //         s: ethers.constants.HashZero,
        //         deadline: 0,
        //         approveMax: false
        //     })

        //     const encodedTransitData = web3.eth.abi.encodeParameters(
        //         ['address', 'address', 'address', 'uint256', 'int128', 'int128', 'uint256', 'int128', 'uint256',
        //          'address', 'address', 'address', 'address', 'uint256','address','uint256'],
        //         [metaExchangeParams.add,
        //         metaExchangeParams.exchange,
        //         metaExchangeParams.remove,
        //         /////
        //         metaExchangeParams.expectedMinMintAmount,
        //         /////
        //         metaExchangeParams.i,
        //         metaExchangeParams.j,
        //         metaExchangeParams.expected_min_dy,
        //         /////
        //         metaExchangeParams.x,
        //         metaExchangeParams.expected_min_amount,
        //         /////
        //         metaExchangeParams.to,
        //         /////
        //         metaExchangeParams.chain2address,
        //         metaExchangeParams.receiveSide,
        //         metaExchangeParams.oppositeBridge,
        //         metaExchangeParams.chainId,
        //         metaExchangeParams.initialBridge,
        //         metaExchangeParams.initialChainID
        //         ]
        //     )

        //     await this.tokenA1.approve(this.portalA.address, totalSupply, { from: userNet1, gas: 300_000 })
        //     const amounts = new Array(3).fill(ethers.utils.parseEther("0.0"))
        //     const testAmount = Math.floor((Math.random() * 100) + 1);
        //     amounts[0] = ethers.utils.parseEther(testAmount.toString() + ".0")
        //     const tokensToSynth = [this.tokenA1.address, this.tokenA2.address, this.tokenA3.address]

        //     await this.portalA.synthesize_batch_transit(
        //         tokensToSynth,
        //         amounts,
        //         synthParams,
        //         selectorMetaExchange,
        //         encodedTransitData,
        //         permitParams,
        //         { from: userNet1, gas: 1000_000 }
        //     )

        //     await timeout(25000)
        //     assert(this.balanceB2.lt(await this.tokenB2.balanceOf(userNet2)))
        // })
    })
})
