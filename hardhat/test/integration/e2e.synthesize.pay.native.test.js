let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, addressToBytes32, timeout, signWorkerPermit } = require("../../utils/helper");
const { ethers } = require("hardhat");

contract('Router', () => {

    describe("synthesize pay native local test", () => {
        before(async () => {
            ERC20A = artifacts.require('ERC20Mock')
            ERC20B = artifacts.require('ERC20Mock')
            ERC20C = artifacts.require('ERC20Mock')

            RouterA = artifacts.require('Router')
            RouterB = artifacts.require('Router')
            RouterC = artifacts.require('Router')

            SynthesisA = artifacts.require('Synthesis')
            SynthesisB = artifacts.require('Synthesis')
            SynthesisC = artifacts.require('Synthesis')

            factoryProvider = checkoutProvider({ 'typenet': 'devstand', 'net1': 'network1', 'net2': 'network2', 'net3': 'network3' })
            totalSupply = ethers.constants.MaxUint256

            RouterA.setProvider(factoryProvider.web3Net1)
            RouterB.setProvider(factoryProvider.web3Net2)
            RouterC.setProvider(factoryProvider.web3Net3)

            SynthesisA.setProvider(factoryProvider.web3Net1)
            SynthesisB.setProvider(factoryProvider.web3Net2)
            SynthesisC.setProvider(factoryProvider.web3Net3)

            ERC20A.setProvider(factoryProvider.web3Net1)
            ERC20B.setProvider(factoryProvider.web3Net2)
            ERC20C.setProvider(factoryProvider.web3Net3)

            userNet1 = (await RouterA.web3.eth.getAccounts())[0];
            userNet2 = (await RouterB.web3.eth.getAccounts())[0];
            userNet3 = (await RouterC.web3.eth.getAccounts())[0];

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

        })

        it("Synthesize (pay native): network1 -> network2(hub)", async function () {
            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthB = await SynthB.at(synthAddress)
            const oldBalance = await this.synthB.balanceOf(userNet2)
            const amount = ethers.utils.parseEther("1.0")

            const tokenToSynth = this.tokenA1.address
            const receiveSideB = deployInfo["network2"].synthesis
            const oppositeBridge = deployInfo["network2"].bridge
            const chainIdFrom = deployInfo["network1"].chainId
            const chainIdTo = deployInfo["network2"].chainId
            const userFrom = userNet1
            const userTo = userNet2

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(routerA.address, amount, { from: userNet1, gas: 300_000 })

            const executionHash = await routerA._SYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userNonce = await routerA.nonces(userFrom)
            const signerUserNet1 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK1)
            // console.log(await routerA._trustedWorker(userNet1))
            // const signerUserNet1 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK1)
            // console.log({signerUserNet1, contract:routerA.address, userFrom, workerExecutionPrice, executionHash, userNonce, workerDeadline})
            // const workerSig = await signWorkerPermit(signerUserNet1, routerA.address, userFrom, chainIdTo, workerExecutionPrice, executionHash, userNonce.toString(), workerDeadline)
            // console.log(workerSig)
            // console.log("ow", owner.address)

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
            await routerA.synthesizeRequestPayNative(
                tokenToSynth,
                amount,
                userTo,
                {
                    receiveSide: receiveSideB,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdTo,
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
            // expect((await routerA.synthesizeRequestPayNative(
            //     tokenToSynth,
            //     amount,
            //     userTo,
            //     {
            //         receiveSide: receiveSideB,
            //         oppositeBridge: oppositeBridge,
            //         chainId: chainIdTo,
            //     },
            //     {
            //         executionPrice: workerExecutionPrice,
            //         deadline: workerDeadline,
            //         v: workerSignature.v,
            //         r: workerSignature.r,
            //         s: workerSignature.s
            //     },
            //     { from: userNet1, gas: 1000_000, value: workerExecutionPrice }
            // ))).to.emit(routerA.address, 'CrosschainPaymentEvent').withArgs(userNet1, userNet1, workerExecutionPrice);

            await timeout(25000)
            const newBalance = await this.synthB.balanceOf(userNet2)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize (pay native): network1 -> network3", async function () {
            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthC = await SynthC.at(synthAddress)
            const oldBalance = await this.synthC.balanceOf(userNet3)
            const amount = ethers.utils.parseEther("1.0")

            const tokenToSynth = this.tokenA1.address
            const receiveSideC = deployInfo["network3"].synthesis
            const oppositeBridge = deployInfo["network3"].bridge
            const chainIdFrom = deployInfo["network1"].chainId
            const chainIdTo = deployInfo["network3"].chainId
            const userFrom = userNet1
            const userTo = userNet3

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(routerA.address, amount, { from: userNet1, gas: 300_000 })

            const executionHash = await routerA._SYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userNonce = await routerA.nonces(userFrom)
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

            await routerA.synthesizeRequestPayNative(
                tokenToSynth,
                amount,
                userTo,
                {
                    receiveSide: receiveSideC,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdTo,
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

            // expect(await routerA.synthesizeRequestPayNative(
            //     tokenToSynth,
            //     amount,
            //     userTo,
            //     {
            //         receiveSide: receiveSideC,
            //         oppositeBridge: oppositeBridge,
            //         chainId: chainIdTo,
            //     },
            //     {
            //         executionPrice: workerExecutionPrice,
            //         deadline: workerDeadline,
            //         v: workerSignature.v,
            //         r: workerSignature.r,
            //         s: workerSignature.s
            //     },
            //     { from: userNet1, gas: 1000_000, value: workerExecutionPrice }
            // )).to.emit(routerA.address, 'CrosschainPaymentEvent').withArgs(userNet1, userNet1, workerExecutionPrice);

            await timeout(25000)
            const newBalance = await this.synthC.balanceOf(userNet3)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize (pay native): network2 -> network3", async function () {
            this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(this.tokenB1.address))
            this.synthC = await SynthC.at(synthAddress)
            const oldBalance = await this.synthC.balanceOf(userNet3)
            const amount = ethers.utils.parseEther("1.0")

            const tokenToSynth = this.tokenB1.address
            const receiveSideC = deployInfo["network3"].synthesis
            const oppositeBridge = deployInfo["network3"].bridge
            const chainIdFrom = deployInfo["network2"].chainId
            const chainIdTo = deployInfo["network3"].chainId
            const userFrom = userNet2
            const userTo = userNet3

            await this.tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
            await this.tokenB1.approve(routerB.address, amount, { from: userNet2, gas: 300_000 })

            const executionHash = await routerB._SYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userNonce = await routerB.nonces(userFrom)
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

            await routerB.synthesizeRequestPayNative(
                tokenToSynth,
                amount,
                userTo,
                {
                    receiveSide: receiveSideC,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdTo,
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

            // expect(await routerB.synthesizeRequestPayNative(
            //     tokenToSynth,
            //     amount,
            //     userTo,
            //     {
            //         receiveSide: receiveSideC,
            //         oppositeBridge: oppositeBridge,
            //         chainId: chainIdTo,
            //     },
            //     {
            //         executionPrice: workerExecutionPrice,
            //         deadline: workerDeadline,
            //         v: workerSignature.v,
            //         r: workerSignature.r,
            //         s: workerSignature.s
            //     },
            //     { from: userNet2, gas: 1000_000, value: workerExecutionPrice }
            // )).to.emit(routerB.address, 'CrosschainPaymentEvent').withArgs(userNet2, userNet2, workerExecutionPrice);

            await timeout(25000)
            const newBalance = await this.synthC.balanceOf(userNet3)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize (pay native): network2 -> network1", async function () {
            this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(this.tokenB1.address))
            this.synthA = await SynthA.at(synthAddress)
            const oldBalance = await this.synthA.balanceOf(userNet1)
            const amount = ethers.utils.parseEther("1.0")

            const tokenToSynth = this.tokenB1.address
            const receiveSideA = deployInfo["network1"].synthesis
            const oppositeBridge = deployInfo["network1"].bridge
            const chainIdFrom = deployInfo["network2"].chainId
            const chainIdTo = deployInfo["network1"].chainId
            const userFrom = userNet2
            const userTo = userNet1

            await this.tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
            await this.tokenB1.approve(routerB.address, amount, { from: userNet2, gas: 300_000 })

            const executionHash = await routerB._SYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userNonce = await routerB.nonces(userFrom)
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

            await routerB.synthesizeRequestPayNative(
                tokenToSynth,
                amount,
                userTo,
                {
                    receiveSide: receiveSideA,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdTo,
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

            // expect(await routerB.synthesizeRequestPayNative(
            //     tokenToSynth,
            //     amount,
            //     userTo,
            //     {
            //         receiveSide: receiveSideA,
            //         oppositeBridge: oppositeBridge,
            //         chainId: chainIdTo,
            //     },
            //     {
            //         executionPrice: workerExecutionPrice,
            //         deadline: workerDeadline,
            //         v: workerSignature.v,
            //         r: workerSignature.r,
            //         s: workerSignature.s
            //     },
            //     { from: userNet2, gas: 1000_000, value: workerExecutionPrice }
            // )).to.emit(routerB.address, 'CrosschainPaymentEvent').withArgs(userNet2, userNet2, workerExecutionPrice);

            await timeout(25000)
            const newBalance = await this.synthA.balanceOf(userNet1)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize (pay native): network3 -> network1", async function () {
            this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(this.tokenC1.address))
            this.synthA = await SynthA.at(synthAddress)
            const oldBalance = await this.synthA.balanceOf(userNet1)
            const amount = ethers.utils.parseEther("1.0")

            const tokenToSynth = this.tokenC1.address
            const receiveSideA = deployInfo["network1"].synthesis
            const oppositeBridge = deployInfo["network1"].bridge
            const chainIdFrom = deployInfo["network3"].chainId
            const chainIdTo = deployInfo["network1"].chainId
            const userFrom = userNet3
            const userTo = userNet1

            await this.tokenC1.mint(userNet3, amount, { from: userNet3, gas: 300_000 })
            await this.tokenC1.approve(routerC.address, amount, { from: userNet3, gas: 300_000 })

            const executionHash = await routerC._SYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userNonce = await routerC.nonces(userFrom)
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

            await routerC.synthesizeRequestPayNative(
                tokenToSynth,
                amount,
                userTo,
                {
                    receiveSide: receiveSideA,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdTo,
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

            // expect(await routerC.synthesizeRequestPayNative(
            //     tokenToSynth,
            //     amount,
            //     userTo,
            //     {
            //         receiveSide: receiveSideA,
            //         oppositeBridge: oppositeBridge,
            //         chainId: chainIdTo,
            //     },
            //     {
            //         executionPrice: workerExecutionPrice,
            //         deadline: workerDeadline,
            //         v: workerSignature.v,
            //         r: workerSignature.r,
            //         s: workerSignature.s
            //     },
            //     { from: userNet3, gas: 1000_000, value: workerExecutionPrice }
            // )).to.emit(routerC.address, 'CrosschainPaymentEvent').withArgs(userNet3, userNet3, workerExecutionPrice);

            await timeout(25000)
            const newBalance = await this.synthA.balanceOf(userNet1)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize (pay native): network3 -> network2", async function () {
            this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(this.tokenC1.address))
            this.synthB = await SynthB.at(synthAddress)
            const oldBalance = await this.synthB.balanceOf(userNet2)
            const amount = ethers.utils.parseEther("1.0")

            const tokenToSynth = this.tokenC1.address
            const receiveSideB = deployInfo["network2"].synthesis
            const oppositeBridge = deployInfo["network2"].bridge
            const chainIdFrom = deployInfo["network3"].chainId
            const chainIdTo = deployInfo["network2"].chainId
            const userFrom = userNet3
            const userTo = userNet2

            await this.tokenC1.mint(userNet3, amount, { from: userNet3, gas: 300_000 })
            await this.tokenC1.approve(routerC.address, amount, { from: userNet3, gas: 300_000 })

            const executionHash = await routerC._SYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userNonce = await routerC.nonces(userFrom)
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

            await routerC.synthesizeRequestPayNative(
                tokenToSynth,
                amount,
                userTo,
                {
                    receiveSide: receiveSideB,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdTo,
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

            // expect(await routerC.synthesizeRequestPayNative(
            //     tokenToSynth,
            //     amount,
            //     userTo,
            //     {
            //         receiveSide: receiveSideB,
            //         oppositeBridge: oppositeBridge,
            //         chainId: chainIdTo,
            //     },
            //     {
            //         executionPrice: workerExecutionPrice,
            //         deadline: workerDeadline,
            //         v: workerSignature.v,
            //         r: workerSignature.r,
            //         s: workerSignature.s
            //     },
            //     { from: userNet3, gas: 1000_000, value: workerExecutionPrice }
            // )).to.emit(routerC.address, 'CrosschainPaymentEvent').withArgs(userNet3, userNet3, workerExecutionPrice);

            await timeout(25000)
            const newBalance = await this.synthB.balanceOf(userNet2)
            assert(oldBalance.lt(newBalance))
        })
    })
})
