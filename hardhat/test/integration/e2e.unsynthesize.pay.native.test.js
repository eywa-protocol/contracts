let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, addressToBytes32, timeout, signWorkerPermit } = require("../../utils/helper");
const { ethers } = require("hardhat");

contract('Router', () => {

    describe("unsynthesize pay native local test", () => {

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

            routerA = await RouterA.at(deployInfo["network1"].router)
            routerB = await RouterB.at(deployInfo["network2"].router)
            routerC = await RouterC.at(deployInfo["network3"].router)

            await routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })
            await routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })
            await routerC.setTrustedWorker(userNet3, { from: userNet3, gas: 300_000 })

            amount = ethers.utils.parseEther(Math.floor((Math.random() * 10) + 1) + ".0")

        })

        it("Unsynthesize(pay native): network2 -> network1 ", async function () {
            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            routerA = await RouterA.at(deployInfo["network1"].router)
            routerB = await RouterB.at(deployInfo["network2"].router)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthB = await SynthB.at(synthAddress)
            this.oldBalance = await this.synthB.balanceOf(userNet2)
            const tokenToSynth = this.tokenA1.address
            const receiveSideB = deployInfo["network2"].synthesis
            const oppositeBridge = deployInfo["network2"].bridge
            const chainIdB = deployInfo["network2"].chainId

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(routerA.address, amount, { from: userNet1, gas: 300_000 })

            await routerA.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userNet2,
                {
                    receiveSide: receiveSideB,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdB,
                },
                { from: userNet1, gas: 1000_000 }
            )

            await timeout(25000)
            await this.synthB.approve(routerB.address, amount, { from: userNet2, gas: 300_000 })

            const executionHash = await routerB._UNSYNTHESIZE_REQUEST_SIGNATURE_HASH()
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

            await routerB.unsynthesizeRequestPayNative(
                this.synthB.address,
                amount,
                userTo,
                {
                    receiveSide: deployInfo["network1"].portal,
                    oppositeBridge: deployInfo["network1"].bridge,
                    chainId: deployInfo["network1"].chainId,
                },
                {
                    executionPrice: workerExecutionPrice,
                    deadline: workerDeadline,
                    v: workerSignature.v,
                    r: workerSignature.r,
                    s: workerSignature.s
                },
                { from: userNet2, gas: 1000_000, value: workerExecutionPrice }
            )
            await timeout(25000)
            const newBalance = await this.synthB.balanceOf(userNet2)
            assert(this.oldBalance.eq(newBalance))
        })

        it("Unsynthesize(pay native): network2 -> network3 ", async function () {
            this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
            routerC = await RouterC.at(deployInfo["network3"].router)
            routerB = await RouterB.at(deployInfo["network2"].router)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(this.tokenC1.address))
            this.synthB = await SynthB.at(synthAddress)
            this.oldBalance = await this.synthB.balanceOf(userNet2)
            const tokenToSynth = this.tokenC1.address
            const receiveSideB = deployInfo["network2"].synthesis
            const oppositeBridge = deployInfo["network2"].bridge
            const chainIdB = deployInfo["network2"].chainId

            await this.tokenC1.mint(userNet3, amount, { from: userNet3, gas: 300_000 })
            await this.tokenC1.approve(routerC.address, amount, { from: userNet3, gas: 300_000 })

            await routerC.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userNet2,
                {
                    receiveSide: receiveSideB,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdB,
                },
                { from: userNet3, gas: 1000_000 }
            )

            await timeout(25000)
            await this.synthB.approve(routerB.address, amount, { from: userNet2, gas: 300_000 })

            const executionHash = await routerB._UNSYNTHESIZE_REQUEST_SIGNATURE_HASH()
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

            await routerB.unsynthesizeRequestPayNative(
                this.synthB.address,
                amount,
                userTo,
                {
                    receiveSide: deployInfo["network3"].portal,
                    oppositeBridge: deployInfo["network3"].bridge,
                    chainId: deployInfo["network3"].chainId,
                },
                {
                    executionPrice: workerExecutionPrice,
                    deadline: workerDeadline,
                    v: workerSignature.v,
                    r: workerSignature.r,
                    s: workerSignature.s
                },
                { from: userNet2, gas: 1000_000, value: workerExecutionPrice }
            )
            await timeout(25000)
            const newBalance = await this.synthB.balanceOf(userNet2)
            assert(this.oldBalance.eq(newBalance))
        })

        it("Unsynthesize(pay native): network1 -> network2", async function () {

            this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            routerB = await RouterB.at(deployInfo["network2"].router)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(this.tokenB1.address))
            this.synthA = await SynthA.at(synthAddress)
            const oldBalance = await this.synthA.balanceOf(userNet1)
            const tokenToSynth = this.tokenB1.address
            const receiveSideA = deployInfo["network1"].synthesis
            const oppositeBridge = deployInfo["network1"].bridge
            const chainIdA = deployInfo["network1"].chainId

            await this.tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
            await this.tokenB1.approve(routerB.address, amount, { from: userNet2, gas: 300_000 })

            await routerB.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userNet1,
                {
                    receiveSide: receiveSideA,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdA,
                },

                { from: userNet2, gas: 1000_000 }
            )

            await timeout(25000)
            await this.synthA.approve(routerA.address, amount, { from: userNet1, gas: 300_000 })

            const executionHash = await routerA._UNSYNTHESIZE_REQUEST_SIGNATURE_HASH()
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

            await routerA.unsynthesizeRequestPayNative(
                this.synthA.address,
                amount,
                userTo,
                {
                    receiveSide: deployInfo["network2"].portal,
                    oppositeBridge: deployInfo["network2"].bridge,
                    chainId: deployInfo["network2"].chainId,
                },
                {
                    executionPrice: workerExecutionPrice,
                    deadline: workerDeadline,
                    v: workerSignature.v,
                    r: workerSignature.r,
                    s: workerSignature.s
                },
                { from: userNet1, gas: 1000_000, value: workerExecutionPrice }
            )
            await timeout(25000)
            const newBalance = await this.synthA.balanceOf(userNet1)
            assert(oldBalance.eq(newBalance))
        })

        it("Unsynthesize(pay native): network1 -> network3", async function () {

            this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            routerB = await RouterB.at(deployInfo["network2"].router)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(this.tokenB1.address))
            this.synthA = await SynthA.at(synthAddress)
            const oldBalance = await this.synthA.balanceOf(userNet1)
            const tokenToSynth = this.tokenB1.address
            const receiveSideA = deployInfo["network1"].synthesis
            const oppositeBridge = deployInfo["network1"].bridge
            const chainIdA = deployInfo["network1"].chainId

            await this.tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
            await this.tokenB1.approve(routerB.address, amount, { from: userNet2, gas: 300_000 })

            await routerB.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userNet1,
                {
                    receiveSide: receiveSideA,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdA,
                },

                { from: userNet2, gas: 1000_000 }
            )

            await timeout(25000)
            await this.synthA.approve(routerA.address, amount, { from: userNet1, gas: 300_000 })


            const executionHash = await routerA._UNSYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userFrom = userNet1
            const userTo = userNet3
            const userNonce = await routerA.nonces(userFrom)
            const chainIdFrom = deployInfo["network1"].chainId
            const chainIdTo = deployInfo["network3"].chainId
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

            await routerA.unsynthesizeRequestPayNative(
                this.synthA.address,
                amount,
                userTo,
                {
                    receiveSide: deployInfo["network3"].portal,
                    oppositeBridge: deployInfo["network3"].bridge,
                    chainId: deployInfo["network3"].chainId,
                },
                {
                    executionPrice: workerExecutionPrice,
                    deadline: workerDeadline,
                    v: workerSignature.v,
                    r: workerSignature.r,
                    s: workerSignature.s
                },
                { from: userNet1, gas: 1000_000, value: workerExecutionPrice }
            )
            await timeout(25000)
            const newBalance = await this.synthA.balanceOf(userNet1)
            assert(oldBalance.eq(newBalance))
        })

        it("Unsynthesize(pay native): network3 -> network2", async function () {

            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            routerA = await RouterA.at(deployInfo["network1"].router)
            routerC = await RouterC.at(deployInfo["network3"].router)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthC = await SynthC.at(synthAddress)
            const oldBalance = await this.synthC.balanceOf(userNet3)
            const tokenToSynth = this.tokenA1.address
            const receiveSideC = deployInfo["network3"].synthesis
            const oppositeBridge = deployInfo["network3"].bridge
            const chainIdC = deployInfo["network3"].chainId

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(routerA.address, amount, { from: userNet1, gas: 300_000 })

            await routerA.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userNet3,
                {
                    receiveSide: receiveSideC,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdC,
                },

                { from: userNet1, gas: 1000_000 }
            )

            await timeout(25000)
            await this.synthC.approve(routerC.address, amount, { from: userNet3, gas: 300_000 })

            const executionHash = await routerC._UNSYNTHESIZE_REQUEST_SIGNATURE_HASH()
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

            await routerC.unsynthesizeRequestPayNative(
                this.synthC.address,
                amount,
                userTo,
                {
                    receiveSide: deployInfo["network2"].portal,
                    oppositeBridge: deployInfo["network2"].bridge,
                    chainId: deployInfo["network2"].chainId,
                },
                {
                    executionPrice: workerExecutionPrice,
                    deadline: workerDeadline,
                    v: workerSignature.v,
                    r: workerSignature.r,
                    s: workerSignature.s
                },
                { from: userNet3, gas: 1000_000, value: workerExecutionPrice }
            )
            await timeout(25000)
            const newBalance = await this.synthC.balanceOf(userNet3)
            assert(oldBalance.eq(newBalance))
        })

        it("Unsynthesize(pay native): network3 -> network1", async function () {

            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            routerA = await RouterA.at(deployInfo["network1"].router)
            routerC = await RouterC.at(deployInfo["network3"].router)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthC = await SynthC.at(synthAddress)
            const oldBalance = await this.synthC.balanceOf(userNet3)
            const tokenToSynth = this.tokenA1.address
            const receiveSideC = deployInfo["network3"].synthesis
            const oppositeBridge = deployInfo["network3"].bridge
            const chainIdC = deployInfo["network3"].chainId

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(routerA.address, amount, { from: userNet1, gas: 300_000 })

            await routerA.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userNet3,
                {
                    receiveSide: receiveSideC,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdC,
                },

                { from: userNet1, gas: 1000_000 }
            )

            await timeout(25000)
            await this.synthC.approve(routerC.address, amount, { from: userNet3, gas: 300_000 })

            const executionHash = await routerC._UNSYNTHESIZE_REQUEST_SIGNATURE_HASH()
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

            await routerC.unsynthesizeRequestPayNative(
                this.synthC.address,
                amount,
                userTo,
                {
                    receiveSide: deployInfo["network1"].portal,
                    oppositeBridge: deployInfo["network1"].bridge,
                    chainId: deployInfo["network1"].chainId,
                },
                {
                    executionPrice: workerExecutionPrice,
                    deadline: workerDeadline,
                    v: workerSignature.v,
                    r: workerSignature.r,
                    s: workerSignature.s
                },
                { from: userNet3, gas: 1000_000, value: workerExecutionPrice }
            )
            await timeout(25000)
            const newBalance = await this.synthC.balanceOf(userNet3)
            assert(oldBalance.eq(newBalance))
        })
    })
})
