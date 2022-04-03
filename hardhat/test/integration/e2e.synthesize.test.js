let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, timeout } = require("../../utils/helper");
const { ethers } = require("hardhat");
const { userNet2 } = require("./e2e.test");

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

            synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            SynthA = artifacts.require('SyntERC20')
            SynthB = artifacts.require('SyntERC20')
            SynthC = artifacts.require('SyntERC20')

            SynthA.setProvider(factoryProvider.web3Net1)
            SynthB.setProvider(factoryProvider.web3Net2)
            SynthC.setProvider(factoryProvider.web3Net3)

        })


        it("Synthesize: network1 -> network2(hub)", async function () {
            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo["network1"].router)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(tokenA1.address))
            this.Synth = await SynthB.at(synthAddress)
            const oldBalance = this.Synth.balanceOf(userNet2)

            // const testAmount = Math.floor((Math.random() * 100) + 1);
            const amount = ethers.utils.parseEther("0.5")
            const executionPrice = ethers.utils.parseEther("0.1")
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

            const workerMsgHash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'uint256', 'address', 'address', 'uint256'],
                [chainIdA, tokenToSynth, executionPrice, userFrom, userFrom, deadline]
            );

            signerUserNet1 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK1)

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
            
            const newBalance = this.Synth.balanceOf(userNet2)
            assert(oldBalance.lt(newBalance))    
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

        })

        it("Synthesize: network1 -> network3", async function () {

            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo["network1"].router)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(tokenA1.address))
            this.Synth = await SynthC.at(synthAddress)
            const oldBalance = this.Synth.balanceOf(userNet3)

            const amount = ethers.utils.parseEther("0.5")
            const executionPrice = ethers.utils.parseEther("0.1")
            const tokenToSynth = this.tokenA1.address
            const receiveSideC = deployInfo["network3"].synthesis
            const oppositeBridge = deployInfo["network3"].bridge
            const chainIdA = deployInfo["network1"].chainId
            const chainIdC = deployInfo["network3"].chainId
            const userFrom = userNet1
            const userTo = userNet3
            const deadline = "10000000000000"

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })

            const workerMsgHash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'uint256', 'address', 'address', 'uint256'],
                [chainIdA, tokenToSynth, executionPrice, userFrom, userFrom, deadline]
            );

            signerUserNet1 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK1)
            const workerSignature = ethers.utils.splitSignature(await signerUserNet1.signMessage(ethers.utils.arrayify(workerMsgHash)));

            const senderMsgHash = web3.utils.soliditySha3(
                { type: 'uint8', value: workerSignature.v },
                { type: 'bytes32', value: workerSignature.r },
                { type: 'bytes32', value: workerSignature.x }
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
                    receiveSide: receiveSideC,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdC,
                },
                delegatedCallReceipt,
                { from: userNet1, gas: 1000_000 }
            )
            const newBalance = this.Synth.balanceOf(userNet3)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize: network2 -> network1", async function () {

            this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(tokenB1.address))
            this.Synth = await SynthA.at(synthAddress)
            const oldBalance = this.Synth.balanceOf(userNet1)

            const amount = ethers.utils.parseEther("0.5")
            const executionPrice = ethers.utils.parseEther("0.1")
            const tokenToSynth = this.tokenB1.address
            const receiveSideA = deployInfo["network1"].synthesis
            const oppositeBridge = deployInfo["network1"].bridge
            const chainIdB = deployInfo["network2"].chainId
            const chainIdA = deployInfo["network1"].chainId
            const userFrom = userNet2
            const userTo = userNet1
            const deadline = "10000000000000"

            await this.tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
            await this.tokenB1.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })
            await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })

            const workerMsgHash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'uint256', 'address', 'address', 'uint256'],
                [chainIdB, tokenToSynth, executionPrice, userFrom, userFrom, deadline]
            );

            signerUserNet2 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK2)
            const workerSignature = ethers.utils.splitSignature(await signerUserNet2.signMessage(ethers.utils.arrayify(workerMsgHash)));

            const senderMsgHash = web3.utils.soliditySha3(
                { type: 'uint8', value: workerSignature.v },
                { type: 'bytes32', value: workerSignature.r },
                { type: 'bytes32', value: workerSignature.s }
            );

            const senderSignature = ethers.utils.splitSignature(await signerUserNet2.signMessage(ethers.utils.arrayify(senderMsgHash)));

            const delegatedCallReceipt = {
                executionPrice: executionPrice,
                deadline: deadline,
                v: [workerSignature.v, senderSignature.v],
                r: [workerSignature.r, senderSignature.r],
                s: [workerSignature.s, senderSignature.s]
            }

            await this.routerB.delegatedTokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userFrom,
                {
                    to: userTo,
                    receiveSide: receiveSideA,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdA,
                },
                delegatedCallReceipt,
                { from: userNet2, gas: 1000_000 }
            )
            const newBalance = this.Synth.balanceOf(userNet1)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize: network2 -> network3", async function () {

            this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(tokenB1.address))
            this.Synth = await SynthC.at(synthAddress)
            const oldBalance = this.Synth.balanceOf(userNet3)

            const amount = ethers.utils.parseEther("0.5")
            const executionPrice = ethers.utils.parseEther("0.1")
            const tokenToSynth = this.tokenB1.address
            const receiveSideC = deployInfo["network3"].synthesis
            const oppositeBridge = deployInfo["network3"].bridge
            const chainIdB = deployInfo["network2"].chainId
            const chainIdC = deployInfo["network3"].chainId
            const userFrom = userNet2
            const userTo = userNet3
            const deadline = "10000000000000"

            await this.tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
            await this.tokenB1.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })
            await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })

            const workerMsgHash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'uint256', 'address', 'address', 'uint256'],
                [chainIdB, tokenToSynth, executionPrice, userFrom, userFrom, deadline]
            );

            signerUserNet2 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK2)
            const workerSignature = ethers.utils.splitSignature(await signerUserNet2.signMessage(ethers.utils.arrayify(workerMsgHash)));

            const senderMsgHash = web3.utils.soliditySha3(
                { type: 'uint8', value: workerSignature.v },
                { type: 'bytes32', value: workerSignature.r },
                { type: 'bytes32', value: workerSignature.s }
            );

            const senderSignature = ethers.utils.splitSignature(await signerUserNet2.signMessage(ethers.utils.arrayify(senderMsgHash)));

            const delegatedCallReceipt = {
                executionPrice: executionPrice,
                deadline: deadline,
                v: [workerSignature.v, senderSignature.v],
                r: [workerSignature.r, senderSignature.r],
                s: [workerSignature.s, senderSignature.s]
            }

            await this.routerB.delegatedTokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userFrom,
                {
                    to: userTo,
                    receiveSide: receiveSideC,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdC,
                },
                delegatedCallReceipt,
                { from: userNet2, gas: 1000_000 }
            )
            const newBalance = this.Synth.balanceOf(userNet3)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize: network3 -> network1", async function () {

            this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
            this.routerC = await RouterC.at(deployInfo["network3"].router)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(tokenC1.address))
            this.Synth = await SynthA.at(synthAddress)
            const oldBalance = this.Synth.balanceOf(userNet1)

            const amount = ethers.utils.parseEther("0.5")
            const executionPrice = ethers.utils.parseEther("0.1")
            const tokenToSynth = this.tokenC1.address
            const receiveSideA = deployInfo["network1"].synthesis
            const oppositeBridge = deployInfo["network1"].bridge
            const chainIdC = deployInfo["network3"].chainId
            const chainIdA = deployInfo["network1"].chainId
            const userFrom = userNet3
            const userTo = userNet1
            const deadline = "10000000000000"

            await this.tokenC1.mint(userNet3, amount, { from: userNet3, gas: 300_000 })
            await this.tokenC1.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })
            await this.routerC.setTrustedWorker(userNet3, { from: userNet3, gas: 300_000 })

            const workerMsgHash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'uint256', 'address', 'address', 'uint256'],
                [chainIdC, tokenToSynth, executionPrice, userFrom, userFrom, deadline]
            );

            signerUserNet3 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK3)
            const workerSignature = ethers.utils.splitSignature(await signerUserNet3.signMessage(ethers.utils.arrayify(workerMsgHash)));

            const senderMsgHash = web3.utils.soliditySha3(
                { type: 'uint8', value: workerSignature.v },
                { type: 'bytes32', value: workerSignature.r },
                { type: 'bytes32', value: workerSignature.s }
            );

            const senderSignature = ethers.utils.splitSignature(await signerUserNet3.signMessage(ethers.utils.arrayify(senderMsgHash)));

            const delegatedCallReceipt = {
                executionPrice: executionPrice,
                deadline: deadline,
                v: [workerSignature.v, senderSignature.v],
                r: [workerSignature.r, senderSignature.r],
                s: [workerSignature.s, senderSignature.s]
            }

            await this.routerC.delegatedTokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userFrom,
                {
                    to: userTo,
                    receiveSide: receiveSideA,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdA,
                },
                delegatedCallReceipt,
                { from: userNet3, gas: 1000_000 }
            )
            const newBalance = this.Synth.balanceOf(userNet1)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize: network3 -> network2", async function () {
            this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
            this.routerC = await RouterC.at(deployInfo["network3"].router)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(tokenC1.address))
            this.Synth = await SynthB.at(synthAddress)
            const oldBalance = this.Synth.balanceOf(userNet2)
            
            const amount = ethers.utils.parseEther("0.5")
            const executionPrice = ethers.utils.parseEther("0.1")
            const tokenToSynth = this.tokenC1.address
            const receiveSideB = deployInfo["network2"].synthesis
            const oppositeBridge = deployInfo["network2"].bridge
            const chainIdC = deployInfo["network3"].chainId
            const chainIdB = deployInfo["network2"].chainId
            const userFrom = userNet3
            const userTo = userNet2
            const deadline = "10000000000000"

            await this.tokenC1.mint(userNet3, amount, { from: userNet3, gas: 300_000 })
            await this.tokenC1.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })
            await this.routerC.setTrustedWorker(userNet3, { from: userNet3, gas: 300_000 })

            const workerMsgHash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'uint256', 'address', 'address', 'uint256'],
                [chainIdC, tokenToSynth, executionPrice, userFrom, userFrom, deadline]
            );

            signerUserNet3 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK3)
            const workerSignature = ethers.utils.splitSignature(await signerUserNet3.signMessage(ethers.utils.arrayify(workerMsgHash)));

            const senderMsgHash = web3.utils.soliditySha3(
                { type: 'uint8', value: workerSignature.v },
                { type: 'bytes32', value: workerSignature.r },
                { type: 'bytes32', value: workerSignature.s }

            );

            const senderSignature = ethers.utils.splitSignature(await signerUserNet3.signMessage(ethers.utils.arrayify(senderMsgHash)));

            const delegatedCallReceipt = {
                executionPrice: executionPrice,
                deadline: deadline,
                v: [workerSignature.v, senderSignature.v],
                r: [workerSignature.r, senderSignature.r],
                s: [workerSignature.s, senderSignature.s]
            }

            await this.routerC.delegatedTokenSynthesizeRequest(
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
                { from: userNet3, gas: 1000_000 }
            )
            const newBalance = this.Synth.balanceOf(userNet2)
            assert(oldBalance.lt(newBalance))
        })
    })
})
