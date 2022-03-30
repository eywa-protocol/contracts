let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, timeout, addressToBytes32 } = require("../../utils/helper");
const { ethers } = require("hardhat");
const { parseBytes32String } = require("ethers/lib/utils");
const { expect } = require("chai");

contract('Syntesis', () => {

    describe("synthTransferRequest local test", () => {

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

            await tokenA1.mint(userNet1, amount,  { from: userNet1, gas: 300_000 })
            await tokenB1.mint(userNet2, amount,  { from: userNet2, gas: 300_000 })
            await tokenC1.mint(userNet3, amount,  { from: userNet3, gas: 300_000 })


        })

        it("Synt Transfer: network1 -> network3", async function () {
            
            this.synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            this.synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            this.synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            this.routerC = await RouterC.at(deployInfo["network3"].router)

            const synthAddress = await this.synthesisC.getRepresentation(addressToBytes32(deployInfo["network1"].localToken[0].address))
            this.synthTokenC1 = await ERC20C.at(synthAddress)
            synthBalance = await this.synthTokenC1.balanceOf(userNet3)
            

            await tokenA1.approve(this.routerA.address, totalSupply, { from: userNet1, gas: 300_000 })

           //A->B
            await this.routerA.tokenSynthesizeRequest(
                deployInfo['network1'].localToken[0].address,
                amount,
                userNet1,
                userNet2,
                {
                    receiveSide :deployInfo['network2'].synthesis,
                    oppositeBridge: deployInfo['network2'].bridge,
                    chainID :deployInfo['network2'].chainId,
                },
                { from: userNet1, gas: 300_000 }
            )

            await timeout(15000)

            //B->C
            await this.routerB.synthTransferRequest(
                addressToBytes32(deployInfo["network1"].localToken[0].address),
                synthAddress.address,
                amount,
                userNet2,
                userNet3,
                {
                    receiveSide :deployInfo['network3'].synthesis,
                    oppositeBridge: deployInfo['network3'].bridge,
                    chainID :deployInfo['network3'].chainId,
                },
                { from: userNet2, gas: 300_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenC1.balanceOf(userNet3)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synt Transfer: network3 -> network1", async function () {
            
            this.synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            this.synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            this.synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            this.routerC = await RouterC.at(deployInfo["network3"].router)

            const synthAddress = await this.synthesisA.getRepresentation(addressToBytes32(deployInfo["network3"].localToken[0].address))
            this.synthTokenA1 = await ERC20A.at(synthAddress)
            synthBalance = await this.synthTokenA1.balanceOf(userNet1)
            

            await tokenC1.approve(this.routerC.address, totalSupply, { from: userNet3, gas: 300_000 })

           //C->B
            await this.routerC.tokenSynthesizeRequest(
                deployInfo['network3'].localToken[0].address,
                amount,
                userNet3,
                userNet2,
                {
                    receiveSide :deployInfo['network2'].synthesis,
                    oppositeBridge: deployInfo['network2'].bridge,
                    chainID :deployInfo['network2'].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(15000)

            //B->A
            await this.routerB.synthTransferRequest(
                addressToBytes32(deployInfo["network3"].localToken[0].address),
                synthAddress.address,
                amount,
                userNet2,
                userNet1,
                {
                    receiveSide :deployInfo['network1'].synthesis,
                    oppositeBridge: deployInfo['network1'].bridge,
                    chainID :deployInfo['network1'].chainId,
                },
                { from: userNet2, gas: 300_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenA1.balanceOf(userNet1)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synt Transfer: network3 -> network2", async function () {
            
            this.synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            this.synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            this.synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            this.routerC = await RouterC.at(deployInfo["network3"].router)

            const synthAddress = await this.synthesisB.getRepresentation(addressToBytes32(deployInfo["network3"].localToken[0].address))
            this.synthTokenB1 = await ERC20B.at(synthAddress)
            synthBalance = await this.synthTokenB1.balanceOf(userNet2)
            

            await tokenC1.approve(this.routerC.address, totalSupply, { from: userNet3, gas: 300_000 })

           //C->A
            await this.routerC.tokenSynthesizeRequest(
                deployInfo['network3'].localToken[0].address,
                amount,
                userNet3,
                userNet1,
                {
                    receiveSide :deployInfo['network1'].synthesis,
                    oppositeBridge: deployInfo['network1'].bridge,
                    chainID :deployInfo['network1'].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(15000)

            //A->B
            await this.routerA.synthTransferRequest(
                addressToBytes32(deployInfo["network3"].localToken[0].address),
                synthAddress.address,
                amount,
                userNet1,
                userNet2,
                {
                    receiveSide :deployInfo['network2'].synthesis,
                    oppositeBridge: deployInfo['network2'].bridge,
                    chainID :deployInfo['network2'].chainId,
                },
                { from: userNet1, gas: 300_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenB1.balanceOf(userNet2)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synt Transfer: network1 -> network2", async function () {
            
            this.synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            this.synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            this.synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            this.routerC = await RouterC.at(deployInfo["network3"].router)

            const synthAddress = await this.synthesisB.getRepresentation(addressToBytes32(deployInfo["network1"].localToken[0].address))
            this.synthTokenB1 = await ERC20B.at(synthAddress)
            synthBalance = await this.synthTokenB1.balanceOf(userNet2)
            

            await tokenA1.approve(this.routerA.address, totalSupply, { from: userNet1, gas: 300_000 })

           //A->C
            await this.routerA.tokenSynthesizeRequest(
                deployInfo['network1'].localToken[0].address,
                amount,
                userNet1,
                userNet3,
                {
                    receiveSide :deployInfo['network3'].synthesis,
                    oppositeBridge: deployInfo['network3'].bridge,
                    chainID :deployInfo['network3'].chainId,
                },
                { from: userNet1, gas: 300_000 }
            )

            await timeout(15000)

            //C->B
            await this.routerC.synthTransferRequest(
                addressToBytes32(deployInfo["network1"].localToken[0].address),
                synthAddress.address,
                amount,
                userNet3,
                userNet2,
                {
                    receiveSide :deployInfo['network2'].synthesis,
                    oppositeBridge: deployInfo['network2'].bridge,
                    chainID :deployInfo['network2'].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenB1.balanceOf(userNet2)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synt Transfer: network2 -> network1", async function () {
            
            this.synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            this.synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            this.synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            this.routerC = await RouterC.at(deployInfo["network3"].router)

            const synthAddress = await this.synthesisA.getRepresentation(addressToBytes32(deployInfo["network2"].localToken[0].address))
            this.synthTokenA1 = await ERC20A.at(synthAddress)
            synthBalance = await this.synthTokenA1.balanceOf(userNet1)
            

            await tokenB1.approve(this.routerB.address, totalSupply, { from: userNet2, gas: 300_000 })

           //B->C
            await this.routerB.tokenSynthesizeRequest(
                deployInfo['network2'].localToken[0].address,
                amount,
                userNet2,
                userNet3,
                {
                    receiveSide :deployInfo['network3'].synthesis,
                    oppositeBridge: deployInfo['network3'].bridge,
                    chainID :deployInfo['network3'].chainId,
                },
                { from: userNet2, gas: 300_000 }
            )

            await timeout(15000)

            //C->A
            await this.routerC.synthTransferRequest(
                addressToBytes32(deployInfo["network2"].localToken[0].address),
                synthAddress.address,
                amount,
                userNet3,
                userNet1,
                {
                    receiveSide :deployInfo['network1'].synthesis,
                    oppositeBridge: deployInfo['network1'].bridge,
                    chainID :deployInfo['network1'].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenA1.balanceOf(userNet1)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synt Transfer: network3 -> network3", async function () {
            
            this.synthesisA = await SynthesisA.at(deployInfo["network1"].synthesis)
            this.synthesisB = await SynthesisB.at(deployInfo["network2"].synthesis)
            this.synthesisC = await SynthesisC.at(deployInfo["network3"].synthesis)

            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            this.routerC = await RouterC.at(deployInfo["network3"].router)

            const synthAddress = await this.synthesisC.getRepresentation(addressToBytes32(deployInfo["network3"].localToken[0].address))
            this.synthTokenC1 = await ERC20C.at(synthAddress)
            synthBalance = await this.synthTokenC1.balanceOf(userNet3)
            

            await tokenC1.approve(this.routerC.address, totalSupply, { from: userNet3, gas: 300_000 })

           //C->A
            await this.routerC.tokenSynthesizeRequest(
                deployInfo['network3'].localToken[0].address,
                amount,
                userNet3,
                userNet1,
                {
                    receiveSide :deployInfo['network1'].synthesis,
                    oppositeBridge: deployInfo['network1'].bridge,
                    chainID :deployInfo['network1'].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(15000)

            //A->C
            await this.routerA.synthTransferRequest(
                addressToBytes32(deployInfo["network3"].localToken[0].address),
                synthAddress.address,
                amount,
                userNet1,
                userNet3,
                {
                    receiveSide :deployInfo['network3'].synthesis,
                    oppositeBridge: deployInfo['network3'].bridge,
                    chainID :deployInfo['network3'].chainId,
                },
                { from: userNet1, gas: 300_000 }
            )

            await timeout(15000)

            //check balance
            newSynthBalance = await this.synthTokenC1.balanceOf(userNet3)
            assert(synthBalance.lt(newSynthBalance))
        })

    })
})
