let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, timeout, addressToBytes32, signWorkerPermit } = require("../../utils/helper");
const { ethers } = require("hardhat");
const { expect } = require("chai");

contract('Router', () => {

    describe("synth transfer pay native local test", () => {

        before(async () => {
            ERC20A = artifacts.require('SyntERC20')
            ERC20B = artifacts.require('SyntERC20')
            ERC20C = artifacts.require('SyntERC20')

            LERC20A = artifacts.require('ERC20Mock')
            LERC20B = artifacts.require('ERC20Mock')
            LERC20C = artifacts.require('ERC20Mock')

            SynthesisA = artifacts.require('Synthesis')
            SynthesisB = artifacts.require('Synthesis')
            SynthesisC = artifacts.require('Synthesis')

            RouterA = artifacts.require('Router')
            RouterB = artifacts.require('Router')
            RouterC = artifacts.require('Router')

            PortalA = artifacts.require('Portal')
            PortalB = artifacts.require('Portal')
            PortalC = artifacts.require('Portal')

            factoryProvider = checkoutProvider({ 'typenet': 'devstand', 'net1': 'network1', 'net2': 'network2', 'net3': 'network3' })

            totalSupply = ethers.constants.MaxUint256

            RouterA.setProvider(factoryProvider.web3Net1)
            RouterB.setProvider(factoryProvider.web3Net2)
            RouterC.setProvider(factoryProvider.web3Net3)

            SynthesisA.setProvider(factoryProvider.web3Net1)
            SynthesisB.setProvider(factoryProvider.web3Net2)
            SynthesisC.setProvider(factoryProvider.web3Net3)

            PortalA.setProvider(factoryProvider.web3Net1)
            PortalB.setProvider(factoryProvider.web3Net2)
            PortalC.setProvider(factoryProvider.web3Net3)

            ERC20A.setProvider(factoryProvider.web3Net1)
            ERC20B.setProvider(factoryProvider.web3Net2)
            ERC20C.setProvider(factoryProvider.web3Net3)

            LERC20A.setProvider(factoryProvider.web3Net1)
            LERC20B.setProvider(factoryProvider.web3Net2)
            LERC20C.setProvider(factoryProvider.web3Net3)

            userNet1 = (await SynthesisA.web3.eth.getAccounts())[0];
            userNet2 = (await SynthesisB.web3.eth.getAccounts())[0];
            userNet3 = (await SynthesisC.web3.eth.getAccounts())[0];

            tokenA1 = await ERC20A.at(deployInfo['network1'].localToken[0].address)
            tokenB1 = await ERC20B.at(deployInfo['network2'].localToken[0].address)
            tokenC1 = await ERC20C.at(deployInfo['network3'].localToken[0].address)

            const testAmount = Math.floor((Math.random() * 100) + 1);
            amount = ethers.utils.parseEther(testAmount + ".0")

            await tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
            await tokenC1.mint(userNet3, amount, { from: userNet3, gas: 300_000 })

            synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            routerA = await RouterA.at(deployInfo["network1"].router)
            routerB = await RouterB.at(deployInfo["network2"].router)
            routerC = await RouterC.at(deployInfo["network3"].router)

            await routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })
            await routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })
            await routerC.setTrustedWorker(userNet3, { from: userNet3, gas: 300_000 })
        })

        it("Synth Transfer (pay native): network1 -> network3", async function () {
            const synthAddressC1 = await synthesisC.getRepresentation(addressToBytes32(deployInfo["network1"].localToken[0].address))
            const synthAddressB1 = await synthesisB.getRepresentation(addressToBytes32(deployInfo["network1"].localToken[0].address))
            this.synthTokenC1 = await ERC20C.at(synthAddressC1)
            this.synthTokenB1 = await ERC20B.at(synthAddressB1)
            synthBalance = await this.synthTokenC1.balanceOf(userNet3)

            await tokenA1.approve(routerA.address, totalSupply, { from: userNet1, gas: 300_000 })
            await this.synthTokenB1.approve(routerB.address, totalSupply, { from: userNet2, gas: 300_000 })

            //A->B
            await routerA.tokenSynthesizeRequest(
                deployInfo['network1'].localToken[0].address,
                amount,
                userNet2,
                {
                    receiveSide: deployInfo['network2'].synthesis,
                    oppositeBridge: deployInfo['network2'].bridge,
                    chainId: deployInfo['network2'].chainId,
                },
                { from: userNet1, gas: 300_000 }
            )

            await timeout(25000)

            const executionHash = await routerB._SYNTH_TRANSFER_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userFrom = userNet2
            const userTo = userNet3
            const userNonce = await routerB.nonces(userFrom)
            const chainIdFrom = deployInfo["network2"].chainId
            const chainIdTo = deployInfo["network3"].chainId
            const signerUserNet2 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK2)


            const workerSignature = await signWorkerPermit(
                signerUserNet2,
                routerB.address,
                workerExecutionPrice,
                executionHash,
                chainIdFrom,
                chainIdTo,
                userNonce,
                workerDeadline
            )

            //B->C
            await routerB.synthTransferRequestPayNative(
                this.synthTokenB1.address,
                amount,
                userTo,
                {
                    receiveSide: deployInfo['network3'].synthesis,
                    oppositeBridge: deployInfo['network3'].bridge,
                    chainId: deployInfo['network3'].chainId,
                },
                {
                    executionPrice: workerExecutionPrice,
                    deadline: workerDeadline,
                    v: workerSignature.v,
                    r: workerSignature.r,
                    s: workerSignature.s
                },
                { from: userNet2, gas: 300_000, value: workerExecutionPrice }
            )

            await timeout(25000)

            //check balance
            newSynthBalance = await this.synthTokenC1.balanceOf(userNet3)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer (pay native): network3 -> network1", async function () {
            const synthAddressA1 = await synthesisA.getRepresentation(addressToBytes32(deployInfo["network3"].localToken[0].address))
            const synthAddressB1 = await synthesisB.getRepresentation(addressToBytes32(deployInfo["network3"].localToken[0].address))
            this.synthTokenA1 = await ERC20A.at(synthAddressA1)
            this.synthTokenB1 = await ERC20B.at(synthAddressB1)
            synthBalance = await this.synthTokenA1.balanceOf(userNet1)

            await tokenC1.approve(routerC.address, totalSupply, { from: userNet3, gas: 300_000 })
            await this.synthTokenB1.approve(routerB.address, totalSupply, { from: userNet2, gas: 300_000 })

            //C->B
            await routerC.tokenSynthesizeRequest(
                deployInfo['network3'].localToken[0].address,
                amount,
                userNet2,
                {
                    receiveSide: deployInfo['network2'].synthesis,
                    oppositeBridge: deployInfo['network2'].bridge,
                    chainId: deployInfo['network2'].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(25000)

            const executionHash = await routerB._SYNTH_TRANSFER_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userFrom = userNet2
            const userTo = userNet1
            const userNonce = await routerB.nonces(userFrom)
            const chainIdFrom = deployInfo["network2"].chainId
            const chainIdTo = deployInfo["network1"].chainId
            const signerUserNet2 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK2)

            const workerSignature = await signWorkerPermit(
                signerUserNet2,
                routerB.address,
                workerExecutionPrice,
                executionHash,
                chainIdFrom,
                chainIdTo,
                userNonce,
                workerDeadline
            )

            //B->A
            await routerB.synthTransferRequestPayNative(
                this.synthTokenB1.address,
                amount,
                userTo,
                {
                    receiveSide: deployInfo['network1'].synthesis,
                    oppositeBridge: deployInfo['network1'].bridge,
                    chainId: deployInfo['network1'].chainId,
                },
                {
                    executionPrice: workerExecutionPrice,
                    deadline: workerDeadline,
                    v: workerSignature.v,
                    r: workerSignature.r,
                    s: workerSignature.s
                },
                { from: userNet2, gas: 300_000, value: workerExecutionPrice }
            )

            await timeout(25000)

            //check balance
            newSynthBalance = await this.synthTokenA1.balanceOf(userNet1)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer (pay native): network3 -> network2", async function () {
            const synthAddressB1 = await synthesisB.getRepresentation(addressToBytes32(deployInfo["network3"].localToken[0].address))
            const synthAddressA1 = await synthesisA.getRepresentation(addressToBytes32(deployInfo["network3"].localToken[0].address))
            this.synthTokenA1 = await ERC20A.at(synthAddressA1)
            this.synthTokenB1 = await ERC20B.at(synthAddressB1)
            synthBalance = await this.synthTokenB1.balanceOf(userNet2)

            await tokenC1.approve(routerC.address, totalSupply, { from: userNet3, gas: 300_000 })
            await this.synthTokenA1.approve(routerA.address, totalSupply, { from: userNet1, gas: 300_000 })

            //C->A
            await routerC.tokenSynthesizeRequest(
                deployInfo['network3'].localToken[0].address,
                amount,
                userNet1,
                {
                    receiveSide: deployInfo['network1'].synthesis,
                    oppositeBridge: deployInfo['network1'].bridge,
                    chainId: deployInfo['network1'].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(25000)

            const executionHash = await routerA._SYNTH_TRANSFER_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userFrom = userNet1
            const userTo = userNet2
            const userNonce = await routerA.nonces(userFrom)
            const chainIdFrom = deployInfo["network1"].chainId
            const chainIdTo = deployInfo["network2"].chainId
            const signerUserNet1 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK1)

            const workerSignature = await signWorkerPermit(
                signerUserNet1,
                routerA.address,
                workerExecutionPrice,
                executionHash,
                chainIdFrom,
                chainIdTo,
                userNonce,
                workerDeadline
            )

            //A->B
            await routerA.synthTransferRequestPayNative(
                this.synthTokenA1.address,
                amount,
                userTo,
                {
                    receiveSide: deployInfo['network2'].synthesis,
                    oppositeBridge: deployInfo['network2'].bridge,
                    chainId: deployInfo['network2'].chainId,
                },
                {
                    executionPrice: workerExecutionPrice,
                    deadline: workerDeadline,
                    v: workerSignature.v,
                    r: workerSignature.r,
                    s: workerSignature.s
                },
                { from: userNet1, gas: 300_000, value: workerExecutionPrice }
            )

            await timeout(25000)

            //check balance
            newSynthBalance = await this.synthTokenB1.balanceOf(userNet2)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer (pay native): network1 -> network2", async function () {

            const synthAddressB1 = await synthesisB.getRepresentation(addressToBytes32(deployInfo["network1"].localToken[0].address))
            const synthAddressC1 = await synthesisC.getRepresentation(addressToBytes32(deployInfo["network1"].localToken[0].address))
            this.synthTokenB1 = await ERC20B.at(synthAddressB1)
            this.synthTokenC1 = await ERC20C.at(synthAddressC1)
            synthBalance = await this.synthTokenB1.balanceOf(userNet2)

            await tokenA1.approve(routerA.address, totalSupply, { from: userNet1, gas: 300_000 })
            await this.synthTokenC1.approve(routerC.address, totalSupply, { from: userNet3, gas: 300_000 })

            //A->C
            await routerA.tokenSynthesizeRequest(
                deployInfo['network1'].localToken[0].address,
                amount,
                userNet3,
                {
                    receiveSide: deployInfo['network3'].synthesis,
                    oppositeBridge: deployInfo['network3'].bridge,
                    chainId: deployInfo['network3'].chainId,
                },
                { from: userNet1, gas: 300_000 }
            )

            await timeout(25000)

            const executionHash = await routerC._SYNTH_TRANSFER_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userFrom = userNet3
            const userTo = userNet2
            const userNonce = await routerC.nonces(userFrom)
            const chainIdFrom = deployInfo["network3"].chainId
            const chainIdTo = deployInfo["network2"].chainId
            const signerUserNet3 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK3)

            const workerSignature = await signWorkerPermit(
                signerUserNet3,
                routerC.address,
                workerExecutionPrice,
                executionHash,
                chainIdFrom,
                chainIdTo,
                userNonce,
                workerDeadline
            )

            //C->B
            await routerC.synthTransferRequestPayNative(
                this.synthTokenC1.address,
                amount,
                userTo,
                {
                    receiveSide: deployInfo['network2'].synthesis,
                    oppositeBridge: deployInfo['network2'].bridge,
                    chainId: deployInfo['network2'].chainId,
                },
                {
                    executionPrice: workerExecutionPrice,
                    deadline: workerDeadline,
                    v: workerSignature.v,
                    r: workerSignature.r,
                    s: workerSignature.s
                },
                { from: userNet3, gas: 300_000, value: workerExecutionPrice }
            )

            await timeout(25000)

            //check balance
            newSynthBalance = await this.synthTokenB1.balanceOf(userNet2)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer (pay native): network2 -> network1", async function () {
            const synthAddressA1 = await synthesisA.getRepresentation(addressToBytes32(deployInfo["network2"].localToken[0].address))
            const synthAddressC1 = await synthesisC.getRepresentation(addressToBytes32(deployInfo["network2"].localToken[0].address))
            this.synthTokenA1 = await ERC20A.at(synthAddressA1)
            this.synthTokenC1 = await ERC20C.at(synthAddressC1)
            synthBalance = await this.synthTokenA1.balanceOf(userNet1)

            await tokenB1.approve(routerB.address, totalSupply, { from: userNet2, gas: 300_000 })
            await this.synthTokenC1.approve(routerC.address, totalSupply, { from: userNet3, gas: 300_000 })

            //B->C
            await routerB.tokenSynthesizeRequest(
                deployInfo['network2'].localToken[0].address,
                amount,
                userNet3,
                {
                    receiveSide: deployInfo['network3'].synthesis,
                    oppositeBridge: deployInfo['network3'].bridge,
                    chainId: deployInfo['network3'].chainId,
                },
                { from: userNet2, gas: 300_000 }
            )

            await timeout(25000)

            const executionHash = await routerC._SYNTH_TRANSFER_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userFrom = userNet3
            const userTo = userNet1
            const userNonce = await routerC.nonces(userFrom)
            const chainIdFrom = deployInfo["network3"].chainId
            const chainIdTo = deployInfo["network1"].chainId
            const signerUserNet3 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK3)

            const workerSignature = await signWorkerPermit(
                signerUserNet3,
                routerC.address,
                workerExecutionPrice,
                executionHash,
                chainIdFrom,
                chainIdTo,
                userNonce,
                workerDeadline
            )

            //C->A
            await routerC.synthTransferRequestPayNative(
                this.synthTokenC1.address,
                amount,
                userTo,
                {
                    receiveSide: deployInfo['network1'].synthesis,
                    oppositeBridge: deployInfo['network1'].bridge,
                    chainId: deployInfo['network1'].chainId,
                },
                {
                    executionPrice: workerExecutionPrice,
                    deadline: workerDeadline,
                    v: workerSignature.v,
                    r: workerSignature.r,
                    s: workerSignature.s
                },
                { from: userNet3, gas: 300_000, value: workerExecutionPrice }
            )

            await timeout(25000)

            //check balance
            newSynthBalance = await this.synthTokenA1.balanceOf(userNet1)
            assert(synthBalance.lt(newSynthBalance))
        })

    })
})
