let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, addressToBytes32, timeout } = require("../../utils/helper");
const { ethers } = require("hardhat");

contract('Router', () => {

    describe("unsynthesize local test", () => {

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

        it("Unsynthsize: network2 -> network3 ", async function () {
            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthB = await SynthB.at(synthAddress)
            this.oldBalance = await this.synthB.balanceOf(userNet2)
            const amount = ethers.utils.parseEther("0.5")
            const executionPrice = ethers.utils.parseEther("0.1")
            const amountToUnsynth = ethers.utils.parseEther("0.4")
            const tokenToSynth = this.tokenA1.address
            const receiveSideB = deployInfo["network2"].synthesis
            const oppositeBridge = deployInfo["network2"].bridge
            const chainIdA = deployInfo["network1"].chainId
            const chainIdB = deployInfo["network2"].chainId
            const deadline = "10000000000000"

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })

            const workerMsgHash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'uint256', 'address', 'address', 'uint256'],
                [chainIdA, tokenToSynth, executionPrice, userNet1, userNet1, deadline]
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
                userNet1,
                {
                    to: userNet2,
                    receiveSide: receiveSideB,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdB,
                },
                delegatedCallReceipt,
                { from: userNet1, gas: 1000_000 }
            )

            await timeout(15000)
            await this.synthB.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })

            await this.routerB.unsynthesizeRequest(
                this.synthB.address,
                amountToUnsynth,
                userNet2,
                userNet3,
                deployInfo["network3"].synthesis,
                deployInfo["network3"].bridge,
                deployInfo["network3"].chainId,
                { from: userNet2, gas: 1000_000 }
            )
            await timeout(15000)
            const newBalance = await this.synthB.balanceOf(userNet2)
            assert(this.oldBalance.eq(newBalance))
        })

        it("Unsynthsize: network2 -> network1 ", async function () {
            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthB = await SynthB.at(synthAddress)
            this.oldBalance = await this.synthB.balanceOf(userNet2)
            const amount = ethers.utils.parseEther("0.5")
            const executionPrice = ethers.utils.parseEther("0.1")
            const amountToUnsynth = ethers.utils.parseEther("0.4")
            const tokenToSynth = this.tokenA1.address
            const receiveSideB = deployInfo["network2"].synthesis
            const oppositeBridge = deployInfo["network2"].bridge
            const chainIdA = deployInfo["network1"].chainId
            const chainIdB = deployInfo["network2"].chainId
            const deadline = "10000000000000"

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })

            const workerMsgHash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'uint256', 'address', 'address', 'uint256'],
                [chainIdA, tokenToSynth, executionPrice, userNet1, userNet1, deadline]
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
                userNet1,
                {
                    to: userNet2,
                    receiveSide: receiveSideB,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdB,
                },
                delegatedCallReceipt,
                { from: userNet1, gas: 1000_000 }
            )

            await timeout(15000)
            await this.synthB.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })

            await this.routerB.unsynthesizeRequest(
                this.synthB.address,
                amountToUnsynth,
                userNet2,
                userNet1,
                deployInfo["network1"].synthesis,
                deployInfo["network1"].bridge,
                deployInfo["network1"].chainId,
                { from: userNet2, gas: 1000_000 }
            )
            await timeout(15000)
            const newBalance = await this.synthB.balanceOf(userNet2)
            assert(this.oldBalance.eq(newBalance))
        })

        it("Unsynthesize: network1 -> network2", async function () {

            this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(this.tokenB1.address))
            this.synthA = await SynthA.at(synthAddress)
            const oldBalance = await this.synthA.balanceOf(userNet1)
            const amount = ethers.utils.parseEther("0.5")
            const executionPrice = ethers.utils.parseEther("0.1")
            const amountToUnsynth = ethers.utils.parseEther("0.4")
            const tokenToSynth = this.tokenB1.address
            const receiveSideA = deployInfo["network1"].synthesis
            const oppositeBridge = deployInfo["network1"].bridge
            const chainIdB = deployInfo["network2"].chainId
            const chainIdA = deployInfo["network1"].chainId
            const deadline = "10000000000000"

            await this.tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
            await this.tokenB1.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })
            await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })

            const workerMsgHash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'uint256', 'address', 'address', 'uint256'],
                [chainIdB, tokenToSynth, executionPrice, userNet2, userNet2, deadline]
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
                userNet2,
                {
                    to: userNet1,
                    receiveSide: receiveSideA,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdA,
                },
                delegatedCallReceipt,
                { from: userNet2, gas: 1000_000 }
            )

            await timeout(15000)
            await this.synthA.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })

            await this.routerA.unsynthesizeRequest(
                this.synthA.address,
                amountToUnsynth,
                userNet1,
                userNet2,
                deployInfo["network2"].synthesis,
                deployInfo["network2"].bridge,
                deployInfo["network2"].chainId,
                { from: userNet1, gas: 1000_000 }
            )
            await timeout(15000)
            const newBalance = await this.synthA.balanceOf(userNet1)
            assert(oldBalance.eq(newBalance))
        })

        it("Unsynthesize: network1 -> network3", async function () {

            this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(this.tokenB1.address))
            this.synthA = await SynthA.at(synthAddress)
            const oldBalance = await this.synthA.balanceOf(userNet1)
            const amount = ethers.utils.parseEther("0.5")
            const executionPrice = ethers.utils.parseEther("0.1")
            const amountToUnsynth = ethers.utils.parseEther("0.4")
            const tokenToSynth = this.tokenB1.address
            const receiveSideA = deployInfo["network1"].synthesis
            const oppositeBridge = deployInfo["network1"].bridge
            const chainIdB = deployInfo["network2"].chainId
            const chainIdA = deployInfo["network1"].chainId
            const deadline = "10000000000000"

            await this.tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
            await this.tokenB1.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })
            await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })

            const workerMsgHash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'uint256', 'address', 'address', 'uint256'],
                [chainIdB, tokenToSynth, executionPrice, userNet2, userNet2, deadline]
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
                userNet2,
                {
                    to: userNet1,
                    receiveSide: receiveSideA,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdA,
                },
                delegatedCallReceipt,
                { from: userNet2, gas: 1000_000 }
            )

            await timeout(15000)
            await this.synthA.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })

            await this.routerA.unsynthesizeRequest(
                this.synthA.address,
                amountToUnsynth,
                userNet1,
                userNet3,
                deployInfo["network3"].synthesis,
                deployInfo["network3"].bridge,
                deployInfo["network3"].chainId,
                { from: userNet1, gas: 1000_000 }
            )
            await timeout(15000)
            const newBalance = await this.synthA.balanceOf(userNet1)
            assert(oldBalance.eq(newBalance))
        })

        it("Unsynthesize: network3 -> network2", async function () {

            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerC = await RouterC.at(deployInfo["network3"].router)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthC = await SynthC.at(synthAddress)
            const oldBalance = await this.synthC.balanceOf(userNet3)
            const amount = ethers.utils.parseEther("0.5")
            const executionPrice = ethers.utils.parseEther("0.1")
            const amountToUnsynth = ethers.utils.parseEther("0.4")
            const tokenToSynth = this.tokenA1.address
            const receiveSideC = deployInfo["network3"].synthesis
            const oppositeBridge = deployInfo["network3"].bridge
            const chainIdA = deployInfo["network1"].chainId
            const chainIdC = deployInfo["network3"].chainId
            const deadline = "10000000000000"

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })

            const workerMsgHash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'uint256', 'address', 'address', 'uint256'],
                [chainIdA, tokenToSynth, executionPrice, userNet1, userNet1, deadline]
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
                userNet1,
                {
                    to: userNet3,
                    receiveSide: receiveSideC,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdC,
                },
                delegatedCallReceipt,
                { from: userNet1, gas: 1000_000 }
            )

            await timeout(15000)
            await this.synthC.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })

            await this.routerC.unsynthesizeRequest(
                this.synthC.address,
                amountToUnsynth,
                userNet3,
                userNet2,
                deployInfo["network2"].synthesis,
                deployInfo["network2"].bridge,
                deployInfo["network2"].chainId,
                { from: userNet3, gas: 1000_000 }
            )
            await timeout(15000)
            const newBalance = await this.synthC.balanceOf(userNet3)
            assert(oldBalance.eq(newBalance))
        })

        it("Unsynthesize: network3 -> network1", async function () {

            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerC = await RouterC.at(deployInfo["network3"].router)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthC = await SynthC.at(synthAddress)
            const oldBalance = await this.synthC.balanceOf(userNet3)
            const amount = ethers.utils.parseEther("0.5")
            const executionPrice = ethers.utils.parseEther("0.1")
            const amountToUnsynth = ethers.utils.parseEther("0.4")
            const tokenToSynth = this.tokenA1.address
            const receiveSideC = deployInfo["network3"].synthesis
            const oppositeBridge = deployInfo["network3"].bridge
            const chainIdA = deployInfo["network1"].chainId
            const chainIdC = deployInfo["network3"].chainId
            const deadline = "10000000000000"

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })

            const workerMsgHash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'uint256', 'address', 'address', 'uint256'],
                [chainIdA, tokenToSynth, executionPrice, userNet1, userNet1, deadline]
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
                userNet1,
                {
                    to: userNet3,
                    receiveSide: receiveSideC,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdC,
                },
                delegatedCallReceipt,
                { from: userNet1, gas: 1000_000 }
            )

            await timeout(15000)
            await this.synthC.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })

            await this.routerC.unsynthesizeRequest(
                this.synthC.address,
                amountToUnsynth,
                userNet3,
                userNet1,
                deployInfo["network1"].synthesis,
                deployInfo["network1"].bridge,
                deployInfo["network1"].chainId,
                { from: userNet3, gas: 1000_000 }
            )
            await timeout(15000)
            const newBalance = await this.synthC.balanceOf(userNet3)
            assert(oldBalance.eq(newBalance))
        })
    })
})
