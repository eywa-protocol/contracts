let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, timeout, addressToBytes32 } = require("../../utils/helper");
const { ethers } = require("hardhat");
const { expect } = require("chai");

contract('Router', () => {

    describe("synth transfer local test", () => {

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

        })

        it("Synth Transfer: network1 -> network3", async function () {
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

            await timeout(15000)

            //B->C
            await routerB.synthTransferRequest(
                synthAddressB1,
                amount,
                userNet3,
                {
                    receiveSide: deployInfo['network3'].synthesis,
                    oppositeBridge: deployInfo['network3'].bridge,
                    chainId: deployInfo['network3'].chainId,
                },
                { from: userNet2, gas: 300_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenC1.balanceOf(userNet3)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer: network3 -> network1", async function () {
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

            await timeout(15000)

            //B->A
            await routerB.synthTransferRequest(
                synthAddressB1,
                amount,
                userNet1,
                {
                    receiveSide: deployInfo['network1'].synthesis,
                    oppositeBridge: deployInfo['network1'].bridge,
                    chainId: deployInfo['network1'].chainId,
                },
                { from: userNet2, gas: 300_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenA1.balanceOf(userNet1)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer: network3 -> network2", async function () {
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

            await timeout(15000)

            //A->B
            await routerA.synthTransferRequest(
                synthAddressA1,
                amount,
                userNet2,
                {
                    receiveSide: deployInfo['network2'].synthesis,
                    oppositeBridge: deployInfo['network2'].bridge,
                    chainId: deployInfo['network2'].chainId,
                },
                { from: userNet1, gas: 300_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenB1.balanceOf(userNet2)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer: network1 -> network2", async function () {

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

            await timeout(15000)

            //C->B
            await routerC.synthTransferRequest(
                synthAddressC1,
                amount,
                userNet2,
                {
                    receiveSide: deployInfo['network2'].synthesis,
                    oppositeBridge: deployInfo['network2'].bridge,
                    chainId: deployInfo['network2'].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenB1.balanceOf(userNet2)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer: network2 -> network1", async function () {
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

            await timeout(15000)

            //C->A
            await routerC.synthTransferRequest(
                synthAddressC1,
                amount,
                userNet1,
                {
                    receiveSide: deployInfo['network1'].synthesis,
                    oppositeBridge: deployInfo['network1'].bridge,
                    chainId: deployInfo['network1'].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenA1.balanceOf(userNet1)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer: should not synthesize in the intial chain", async function () {
            const synthAddressA1 = await synthesisA.getRepresentation(addressToBytes32(deployInfo["network3"].localToken[0].address))
            this.synthTokenA1 = await ERC20A.at(synthAddressA1)

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

            await timeout(15000)

            //A->C
            await expect(routerA.synthTransferRequest(
                synthAddressA1,
                amount,
                userNet3,
                {
                    receiveSide: deployInfo['network3'].synthesis,
                    oppositeBridge: deployInfo['network3'].bridge,
                    chainId: deployInfo['network3'].chainId,
                },
                { from: userNet1, gas: 300_000 }
            )).to.be.revertedWith("Synthesis: can not synthesize in the intial chain")
        })

    })
})
