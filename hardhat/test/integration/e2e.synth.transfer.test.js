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

            prov = process.env.SET_TEST_ENVIROMENT === 'testnet' ? { 'typenet': 'teststand', 'net1': 'mumbai', 'net2': 'harmonytestnet', 'net3': 'bsctestnet' } : { 'typenet': 'devstand', 'net1': 'network1', 'net2': 'network2', 'net3': 'network3' }
            factoryProvider = checkoutProvider(prov)
            gasAmount = process.env.SET_TEST_ENVIROMENT === 'testnet' ? 300_000 : 1000_000
            waitDuration = process.env.SET_TEST_ENVIROMENT === 'testnet' ? 65000 : 15000
            net1 = prov['net1']
            net2 = prov['net2']
            net3 = prov['net3']
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

            if (process.env.SET_TEST_ENVIROMENT === 'testnet') {
                tokenA1 = await ERC20A.at(deployInfo[net1].token[1].address)
                tokenB1 = await ERC20B.at(deployInfo[net2].token[1].address)
                tokenC1 = await ERC20C.at(deployInfo[net3].token[1].address)
            } else {
                tokenA1 = await ERC20A.at(deployInfo[net1].localToken[0].address)
                tokenB1 = await ERC20B.at(deployInfo[net2].localToken[0].address)
                tokenC1 = await ERC20C.at(deployInfo[net3].localToken[0].address)
            }
            amount = ethers.utils.parseEther("0." + Math.floor(Math.random() * 100))

            if (process.env.SET_TEST_ENVIROMENT != 'testnet') {
                await tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
                await tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
                await tokenC1.mint(userNet3, amount, { from: userNet3, gas: 300_000 })
            }

            synthesisA = await SynthesisA.at(deployInfo[net1].synthesis)
            synthesisB = await SynthesisB.at(deployInfo[net2].synthesis)
            synthesisC = await SynthesisC.at(deployInfo[net3].synthesis)

            routerA = await RouterA.at(deployInfo[net1].router)
            routerB = await RouterB.at(deployInfo[net2].router)
            routerC = await RouterC.at(deployInfo[net3].router)

        })

        it("Synth Transfer: network1 -> network3", async function () {
            const synthAddressC1 = await synthesisC.getRepresentation(addressToBytes32(tokenA1))
            const synthAddressB1 = await synthesisB.getRepresentation(addressToBytes32(tokenA1))
            this.synthTokenC1 = await ERC20C.at(synthAddressC1)
            this.synthTokenB1 = await ERC20B.at(synthAddressB1)
            synthBalance = await this.synthTokenC1.balanceOf(userNet3)

            await tokenA1.approve(routerA.address, totalSupply, { from: userNet1, gas: 300_000 })
            await this.synthTokenB1.approve(routerB.address, totalSupply, { from: userNet2, gas: 300_000 })

            //A->B
            await routerA.tokenSynthesizeRequest(
                tokenA1,
                amount,
                userNet2,
                {
                    receiveSide: deployInfo[net2].synthesis,
                    oppositeBridge: deployInfo[net2].bridge,
                    chainId: deployInfo[net2].chainId,
                },
                { from: userNet1, gas: 300_000 }
            )

            await timeout(waitDuration)

            //B->C
            await routerB.synthTransferRequest(
                synthAddressB1,
                amount,
                userNet3,
                {
                    receiveSide: deployInfo[net3].synthesis,
                    oppositeBridge: deployInfo[net3].bridge,
                    chainId: deployInfo[net3].chainId,
                },
                { from: userNet2, gas: 300_000 }
            )

            await timeout(waitDuration)

            //check balance
            newSynthBalance = await this.synthTokenC1.balanceOf(userNet3)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer: network3 -> network1", async function () {
            const synthAddressA1 = await synthesisA.getRepresentation(addressToBytes32(tokenC1))
            const synthAddressB1 = await synthesisB.getRepresentation(addressToBytes32(tokenC1))
            this.synthTokenA1 = await ERC20A.at(synthAddressA1)
            this.synthTokenB1 = await ERC20B.at(synthAddressB1)
            synthBalance = await this.synthTokenA1.balanceOf(userNet1)

            await tokenC1.approve(routerC.address, totalSupply, { from: userNet3, gas: 300_000 })
            await this.synthTokenB1.approve(routerB.address, totalSupply, { from: userNet2, gas: 300_000 })

            //C->B
            await routerC.tokenSynthesizeRequest(
                tokenC1,
                amount,
                userNet2,
                {
                    receiveSide: deployInfo[net2].synthesis,
                    oppositeBridge: deployInfo[net2].bridge,
                    chainId: deployInfo[net2].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(waitDuration)

            //B->A
            await routerB.synthTransferRequest(
                synthAddressB1,
                amount,
                userNet1,
                {
                    receiveSide: deployInfo[net1].synthesis,
                    oppositeBridge: deployInfo[net1].bridge,
                    chainId: deployInfo[net1].chainId,
                },
                { from: userNet2, gas: 300_000 }
            )

            await timeout(waitDuration)

            //check balance
            newSynthBalance = await this.synthTokenA1.balanceOf(userNet1)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer: network3 -> network2", async function () {
            const synthAddressB1 = await synthesisB.getRepresentation(addressToBytes32(tokenC1))
            const synthAddressA1 = await synthesisA.getRepresentation(addressToBytes32(tokenC1))
            this.synthTokenA1 = await ERC20A.at(synthAddressA1)
            this.synthTokenB1 = await ERC20B.at(synthAddressB1)
            synthBalance = await this.synthTokenB1.balanceOf(userNet2)

            await tokenC1.approve(routerC.address, totalSupply, { from: userNet3, gas: 300_000 })
            await this.synthTokenA1.approve(routerA.address, totalSupply, { from: userNet1, gas: 300_000 })

            //C->A
            await routerC.tokenSynthesizeRequest(
                tokenC1,
                amount,
                userNet1,
                {
                    receiveSide: deployInfo[net1].synthesis,
                    oppositeBridge: deployInfo[net1].bridge,
                    chainId: deployInfo[net1].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(waitDuration)

            //A->B
            await routerA.synthTransferRequest(
                synthAddressA1,
                amount,
                userNet2,
                {
                    receiveSide: deployInfo[net2].synthesis,
                    oppositeBridge: deployInfo[net2].bridge,
                    chainId: deployInfo[net2].chainId,
                },
                { from: userNet1, gas: 300_000 }
            )

            await timeout(waitDuration)

            //check balance
            newSynthBalance = await this.synthTokenB1.balanceOf(userNet2)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer: network1 -> network2", async function () {

            const synthAddressB1 = await synthesisB.getRepresentation(addressToBytes32(tokenB1))
            const synthAddressC1 = await synthesisC.getRepresentation(addressToBytes32(tokenB1))
            this.synthTokenB1 = await ERC20B.at(synthAddressB1)
            this.synthTokenC1 = await ERC20C.at(synthAddressC1)
            synthBalance = await this.synthTokenB1.balanceOf(userNet2)

            await tokenA1.approve(routerA.address, totalSupply, { from: userNet1, gas: 300_000 })
            await this.synthTokenC1.approve(routerC.address, totalSupply, { from: userNet3, gas: 300_000 })

            //A->C
            await routerA.tokenSynthesizeRequest(
                tokenB1,
                amount,
                userNet3,
                {
                    receiveSide: deployInfo[net3].synthesis,
                    oppositeBridge: deployInfo[net3].bridge,
                    chainId: deployInfo[net3].chainId,
                },
                { from: userNet1, gas: 300_000 }
            )

            await timeout(waitDuration)

            //C->B
            await routerC.synthTransferRequest(
                synthAddressC1,
                amount,
                userNet2,
                {
                    receiveSide: deployInfo[net2].synthesis,
                    oppositeBridge: deployInfo[net2].bridge,
                    chainId: deployInfo[net2].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(waitDuration)

            //check balance
            newSynthBalance = await this.synthTokenB1.balanceOf(userNet2)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer: network2 -> network1", async function () {
            const synthAddressA1 = await synthesisA.getRepresentation(addressToBytes32(tokenB1))
            const synthAddressC1 = await synthesisC.getRepresentation(addressToBytes32(tokenB1))
            this.synthTokenA1 = await ERC20A.at(synthAddressA1)
            this.synthTokenC1 = await ERC20C.at(synthAddressC1)
            synthBalance = await this.synthTokenA1.balanceOf(userNet1)

            await tokenB1.approve(routerB.address, totalSupply, { from: userNet2, gas: 300_000 })
            await this.synthTokenC1.approve(routerC.address, totalSupply, { from: userNet3, gas: 300_000 })

            //B->C
            await routerB.tokenSynthesizeRequest(
                tokenB1,
                amount,
                userNet3,
                {
                    receiveSide: deployInfo[net3].synthesis,
                    oppositeBridge: deployInfo[net3].bridge,
                    chainId: deployInfo[net3].chainId,
                },
                { from: userNet2, gas: 300_000 }
            )

            await timeout(waitDuration)

            //C->A
            await routerC.synthTransferRequest(
                synthAddressC1,
                amount,
                userNet1,
                {
                    receiveSide: deployInfo[net1].synthesis,
                    oppositeBridge: deployInfo[net1].bridge,
                    chainId: deployInfo[net1].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(waitDuration)

            //check balance
            newSynthBalance = await this.synthTokenA1.balanceOf(userNet1)
            assert(synthBalance.lt(newSynthBalance))
        })

        it("Synth Transfer: should not synthesize in the intial chain", async function () {
            const synthAddressA1 = await synthesisA.getRepresentation(addressToBytes32(tokenC1))
            this.synthTokenA1 = await ERC20A.at(synthAddressA1)

            await tokenC1.approve(routerC.address, totalSupply, { from: userNet3, gas: 300_000 })
            await this.synthTokenA1.approve(routerA.address, totalSupply, { from: userNet1, gas: 300_000 })

            //C->A
            await routerC.tokenSynthesizeRequest(
                tokenC1,
                amount,
                userNet1,
                {
                    receiveSide: deployInfo[net1].synthesis,
                    oppositeBridge: deployInfo[net1].bridge,
                    chainId: deployInfo[net1].chainId,
                },
                { from: userNet3, gas: 300_000 }
            )

            await timeout(waitDuration)

            //A->C
            await expect(routerA.synthTransferRequest(
                synthAddressA1,
                amount,
                userNet3,
                {
                    receiveSide: deployInfo[net3].synthesis,
                    oppositeBridge: deployInfo[net3].bridge,
                    chainId: deployInfo[net3].chainId,
                },
                { from: userNet1, gas: 300_000 }
            )).to.be.revertedWith("Synthesis: can not synthesize in the intial chain")
        })

    })
})
