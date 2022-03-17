let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, timeout, addressToBytes32 } = require("../../utils/helper");
const { ethers } = require("hardhat");
const { parseBytes32String } = require("ethers/lib/utils");
const { expect } = require("chai");

contract('Syntesis', () => {

    describe("SyntTransfer local test", () => {

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

            PortalA = artifacts.require('Portal')
            PortalB = artifacts.require('Portal')
            PortalC = artifacts.require('Portal')

            factoryProvider = checkoutProvider({ 'typenet': 'devstand', 'net1': 'network1', 'net2': 'network2', 'net3': 'network3' })

            totalSupply = ethers.constants.MaxUint256

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

            await tokenA1.mint(userNet1, amount,  { from: userNet1, gas: 300_000 })
            console.log(parseInt(await tokenA1.balanceOf(userNet1)))

            await tokenB1.mint(userNet2, amount,  { from: userNet2, gas: 300_000 })
            console.log(parseInt(await tokenB1.balanceOf(userNet2)))

            await tokenC1.mint(userNet3, amount,  { from: userNet3, gas: 300_000 })
            console.log(parseInt(await tokenC1.balanceOf(userNet3)))

        })

        it("Synt Transfer: network1 -> network3", async function () {
            
            this.synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            this.synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            this.synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            this.portalA = await PortalA.at(deployInfo["network1"].portal)
            this.portalB = await PortalB.at(deployInfo["network2"].portal)
            this.portalC = await PortalC.at(deployInfo["network3"].portal)

            const synthAddress = await this.synthesisC.getRepresentation(addressToBytes32(deployInfo["network1"].localToken[0].address))
            this.synthTokenC1 = await ERC20C.at(synthAddress)
            synthBalance = await this.synthTokenC1.balanceOf(userNet3)
            console.log(parseInt(synthBalance))

            await tokenA1.approve(this.portalA.address, totalSupply, { from: userNet1, gas: 300_000 })

           //A->B
            await this.portalA.synthesize(
                deployInfo['network1'].localToken[0].address,
                amount,
                userNet2,
                deployInfo['network2'].synthesis,
                deployInfo['network2'].bridge,
                deployInfo['network2'].chainId,
                { from: userNet1, gas: 300_000 }
            )

            await timeout(15000)

            //B->C
            await this.synthesisB.synthTransfer(
                addressToBytes32(deployInfo["network1"].localToken[0].address),
                amount,
                deployInfo["network3"].bridge,
                deployInfo["network3"].synthesis,
                deployInfo["network3"].chainId,
                userNet3,
                { from: userNet2, gas: 1000_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenC1.balanceOf(userNet3)
            console.log(parseInt(newSynthBalance))
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synt Transfer: network3 -> network1", async function () {
            
            this.synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            this.synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            this.synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            this.portalA = await PortalA.at(deployInfo["network1"].portal)
            this.portalB = await PortalB.at(deployInfo["network2"].portal)
            this.portalC = await PortalC.at(deployInfo["network3"].portal)

            const synthAddress = await this.synthesisA.getRepresentation(addressToBytes32(deployInfo["network3"].localToken[0].address))
            this.synthTokenA1 = await ERC20A.at(synthAddress)
            synthBalance = await this.synthTokenA1.balanceOf(userNet1)
            console.log(parseInt(synthBalance))

            await tokenC1.approve(this.portalC.address, totalSupply, { from: userNet3, gas: 300_000 })

           //C->B
            await this.portalC.synthesize(
                deployInfo['network3'].localToken[0].address,
                amount,
                userNet2,
                deployInfo['network2'].synthesis,
                deployInfo['network2'].bridge,
                deployInfo['network2'].chainId,
                { from: userNet3, gas: 300_000 }
            )

            await timeout(15000)

            //B->A
            await this.synthesisB.synthTransfer(
                addressToBytes32(deployInfo["network3"].localToken[0].address),
                amount,
                deployInfo["network1"].bridge,
                deployInfo["network1"].synthesis,
                deployInfo["network1"].chainId,
                userNet1,
                { from: userNet2, gas: 1000_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenA1.balanceOf(userNet1)
            console.log(parseInt(newSynthBalance))
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synt Transfer: network3 -> network2", async function () {
            
            this.synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            this.synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            this.synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            this.portalA = await PortalA.at(deployInfo["network1"].portal)
            this.portalB = await PortalB.at(deployInfo["network2"].portal)
            this.portalC = await PortalC.at(deployInfo["network3"].portal)

            const synthAddress = await this.synthesisB.getRepresentation(addressToBytes32(deployInfo["network3"].localToken[0].address))
            this.synthTokenB1 = await ERC20B.at(synthAddress)
            synthBalance = await this.synthTokenB1.balanceOf(userNet2)
            console.log(parseInt(synthBalance))

            await tokenC1.approve(this.portalC.address, totalSupply, { from: userNet3, gas: 300_000 })

           //C->A
            await this.portalC.synthesize(
                deployInfo['network3'].localToken[0].address,
                amount,
                userNet1,
                deployInfo['network1'].synthesis,
                deployInfo['network1'].bridge,
                deployInfo['network1'].chainId,
                { from: userNet3, gas: 300_000 }
            )

            await timeout(15000)

            //A->B
            await this.synthesisA.synthTransfer(
                addressToBytes32(deployInfo["network3"].localToken[0].address),
                amount,
                deployInfo["network2"].bridge,
                deployInfo["network2"].synthesis,
                deployInfo["network2"].chainId,
                userNet2,
                { from: userNet1, gas: 1000_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenB1.balanceOf(userNet2)
            console.log(parseInt(newSynthBalance))
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synt Transfer: network1 -> network2", async function () {
            
            this.synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            this.synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            this.synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            this.portalA = await PortalA.at(deployInfo["network1"].portal)
            this.portalB = await PortalB.at(deployInfo["network2"].portal)
            this.portalC = await PortalC.at(deployInfo["network3"].portal)

            const synthAddress = await this.synthesisB.getRepresentation(addressToBytes32(deployInfo["network1"].localToken[0].address))
            this.synthTokenB1 = await ERC20B.at(synthAddress)
            synthBalance = await this.synthTokenB1.balanceOf(userNet2)
            console.log(parseInt(synthBalance))

            await tokenA1.approve(this.portalA.address, totalSupply, { from: userNet1, gas: 300_000 })

           //A->C
            await this.portalA.synthesize(
                deployInfo['network1'].localToken[0].address,
                amount,
                userNet3,
                deployInfo['network3'].synthesis,
                deployInfo['network3'].bridge,
                deployInfo['network3'].chainId,
                { from: userNet1, gas: 300_000 }
            )

            await timeout(15000)

            //C->B
            await this.synthesisC.synthTransfer(
                addressToBytes32(deployInfo["network1"].localToken[0].address),
                amount,
                deployInfo["network2"].bridge,
                deployInfo["network2"].synthesis,
                deployInfo["network2"].chainId,
                userNet2,
                { from: userNet3, gas: 1000_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenB1.balanceOf(userNet2)
            console.log(parseInt(newSynthBalance))
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synt Transfer: network2 -> network1", async function () {
            
            this.synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            this.synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            this.synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            this.portalA = await PortalA.at(deployInfo["network1"].portal)
            this.portalB = await PortalB.at(deployInfo["network2"].portal)
            this.portalC = await PortalC.at(deployInfo["network3"].portal)

            const synthAddress = await this.synthesisA.getRepresentation(addressToBytes32(deployInfo["network2"].localToken[0].address))
            this.synthTokenA1 = await ERC20A.at(synthAddress)
            synthBalance = await this.synthTokenA1.balanceOf(userNet1)
            console.log(parseInt(synthBalance))

            await tokenB1.approve(this.portalB.address, totalSupply, { from: userNet2, gas: 300_000 })

           //B->C
            await this.portalB.synthesize(
                deployInfo['network2'].localToken[0].address,
                amount,
                userNet3,
                deployInfo['network3'].synthesis,
                deployInfo['network3'].bridge,
                deployInfo['network3'].chainId,
                { from: userNet2, gas: 300_000 }
            )

            await timeout(15000)

            //C->A
            await this.synthesisC.synthTransfer(
                addressToBytes32(deployInfo["network2"].localToken[0].address),
                amount,
                deployInfo["network1"].bridge,
                deployInfo["network1"].synthesis,
                deployInfo["network1"].chainId,
                userNet1,
                { from: userNet3, gas: 1000_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenA1.balanceOf(userNet1)
            console.log(parseInt(newSynthBalance))
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synt Transfer: network3 -> network3", async function () {
            
            this.synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            this.synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            this.synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            this.portalA = await PortalA.at(deployInfo["network1"].portal)
            this.portalB = await PortalB.at(deployInfo["network2"].portal)
            this.portalC = await PortalC.at(deployInfo["network3"].portal)

            const synthAddress = await this.synthesisC.getRepresentation(addressToBytes32(deployInfo["network3"].localToken[0].address))
            this.synthTokenC1 = await ERC20C.at(synthAddress)
            synthBalance = await this.synthTokenC1.balanceOf(userNet3)
            console.log(parseInt(synthBalance))

            await tokenC1.approve(this.portalC.address, totalSupply, { from: userNet3, gas: 300_000 })

           //C->A
            await this.portalC.synthesize(
                deployInfo['network3'].localToken[0].address,
                amount,
                userNet1,
                deployInfo['network1'].synthesis,
                deployInfo['network1'].bridge,
                deployInfo['network1'].chainId,
                { from: userNet3, gas: 300_000 }
            )

            await timeout(15000)

            //A->C
            await this.synthesisA.synthTransfer(
                addressToBytes32(deployInfo["network3"].localToken[0].address),
                amount,
                deployInfo["network3"].bridge,
                deployInfo["network3"].synthesis,
                deployInfo["network3"].chainId,
                userNet3,
                { from: userNet1, gas: 1000_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenC1.balanceOf(userNet3)
            console.log(parseInt(newSynthBalance))
            assert(synthBalance.lt(newSynthBalance))
        })

    })
})