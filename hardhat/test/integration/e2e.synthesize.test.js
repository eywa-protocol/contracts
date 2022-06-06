let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, addressToBytes32, timeout } = require("../../utils/helper");
const { ethers } = require("hardhat");

contract('Router', () => {

    describe("synthesize local test", () => {

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

            ERC20A.setProvider(factoryProvider.web3Net1)
            ERC20B.setProvider(factoryProvider.web3Net2)
            ERC20C.setProvider(factoryProvider.web3Net3)

            userNet1 = (await RouterA.web3.eth.getAccounts())[0];
            userNet2 = (await RouterB.web3.eth.getAccounts())[0];
            userNet3 = (await RouterC.web3.eth.getAccounts())[0];

            synthesisA = await SynthesisA.at(deployInfo[net1].synthesis)
            synthesisB = await SynthesisB.at(deployInfo[net2].synthesis)
            synthesisC = await SynthesisC.at(deployInfo[net3].synthesis)

            SynthA = artifacts.require('SyntERC20')
            SynthB = artifacts.require('SyntERC20')
            SynthC = artifacts.require('SyntERC20')

            SynthA.setProvider(factoryProvider.web3Net1)
            SynthB.setProvider(factoryProvider.web3Net2)
            SynthC.setProvider(factoryProvider.web3Net3)

        })

        it("Synthesize: network1(mumbai) -> network2(harmony)", async function () {
            this.tokenA1 = await ERC20A.at(process.env.SET_TEST_ENVIROMENT === 'testnet' ? deployInfo[net1].token[1].address : deployInfo[net1].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo[net1].router)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthB = await SynthB.at(synthAddress)
            const oldBalance = await this.synthB.balanceOf(userNet2)
            const amount = ethers.utils.parseEther("0." + Math.floor(Math.random() * 100))

            const tokenToSynth = this.tokenA1.address
            const receiveSideB = deployInfo[net2].synthesis
            const oppositeBridge = deployInfo[net2].bridge
            const chainIdB = deployInfo[net2].chainId
            const userFrom = userNet1
            const userTo = userNet2

            await this.tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            if (process.env.SET_TEST_ENVIROMENT != 'testnet'){
                await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
                await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })
            }
            await this.routerA.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userTo,
                {
                    receiveSide: receiveSideB,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdB,
                },

                { from: userNet1, gas: gasAmount }
            )
            await timeout(waitDuration)
            const newBalance = await this.synthB.balanceOf(userNet2)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize: network1 -> network3", async function () {

            this.tokenA1 = await ERC20A.at(process.env.SET_TEST_ENVIROMENT === 'testnet' ? deployInfo[net1].token[1].address : deployInfo[net1].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo[net1].router)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthC = await SynthC.at(synthAddress)
            const oldBalance = await this.synthC.balanceOf(userNet3)
            const amount = ethers.utils.parseEther("0." + Math.floor(Math.random() * 100))

            const tokenToSynth = this.tokenA1.address
            const receiveSideC = deployInfo[net3].synthesis
            const oppositeBridge = deployInfo[net3].bridge
            const chainIdC = deployInfo[net3].chainId
            const userFrom = userNet1
            const userTo = userNet3

            await this.tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            if (process.env.SET_TEST_ENVIROMENT != 'testnet'){
                await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
                await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })
            }

            await this.routerA.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userTo,
                {
                    receiveSide: receiveSideC,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdC,
                },

                { from: userNet1, gas: gasAmount }
            )
            await timeout(waitDuration)
            const newBalance = await this.synthC.balanceOf(userNet3)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize: network2 -> network1", async function () {

            this.tokenB1 = await ERC20B.at(process.env.SET_TEST_ENVIROMENT === 'testnet' ? deployInfo[net1].token[1].address : deployInfo[net2].localToken[0].address)
            this.routerB = await RouterB.at(deployInfo[net2].router)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(this.tokenB1.address))
            this.synthA = await SynthA.at(synthAddress)
            const oldBalance = await this.synthA.balanceOf(userNet1)
            const amount = ethers.utils.parseEther("0." + Math.floor(Math.random() * 100))

            const tokenToSynth = this.tokenB1.address
            const receiveSideA = deployInfo[net1].synthesis
            const oppositeBridge = deployInfo[net1].bridge
            const chainIdA = deployInfo[net1].chainId
            const userFrom = userNet2
            const userTo = userNet1

            await this.tokenB1.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })
            if (process.env.SET_TEST_ENVIROMENT != 'testnet'){
                await this.tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
                await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })
            }

            await this.routerB.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userTo,
                {
                    receiveSide: receiveSideA,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdA,
                },

                { from: userNet2, gas: gasAmount }
            )
            await timeout(waitDuration)
            const newBalance = await this.synthA.balanceOf(userNet1)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize: network2 -> network3", async function () {

            this.tokenB1 = await ERC20B.at(process.env.SET_TEST_ENVIROMENT === 'testnet' ? deployInfo[net1].token[1].address : deployInfo[net2].localToken[0].address)
            this.routerB = await RouterB.at(deployInfo[net2].router)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(this.tokenB1.address))
            this.synthC = await SynthC.at(synthAddress)
            const oldBalance = await this.synthC.balanceOf(userNet3)
            const amount = ethers.utils.parseEther("0." + Math.floor(Math.random() * 100))

            const tokenToSynth = this.tokenB1.address
            const receiveSideC = deployInfo[net3].synthesis
            const oppositeBridge = deployInfo[net3].bridge
            const chainIdC = deployInfo[net3].chainId
            const userFrom = userNet2
            const userTo = userNet3

            await this.tokenB1.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })
            if (process.env.SET_TEST_ENVIROMENT != 'testnet'){
                await this.tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
                await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })
            }

            await this.routerB.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userTo,
                {
                    receiveSide: receiveSideC,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdC,
                },

                { from: userNet2, gas: gasAmount }
            )
            await timeout(waitDuration)
            const newBalance = await this.synthC.balanceOf(userNet3)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize: network3(bsc) -> network1(mumbai)", async function () {

            this.tokenC1 = await ERC20C.at(process.env.SET_TEST_ENVIROMENT === 'testnet' ? deployInfo[net3].token[1].address : deployInfo[net3].localToken[0].address)
            this.routerC = await RouterC.at(deployInfo[net3].router)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(this.tokenC1.address))
            this.synthA = await SynthA.at(synthAddress)
            const oldBalance = await this.synthA.balanceOf(userNet1)
            const amount = ethers.utils.parseEther("0." + Math.floor(Math.random() * 100))

            const tokenToSynth = this.tokenC1.address
            const receiveSideA = deployInfo[net1].synthesis
            const oppositeBridge = deployInfo[net1].bridge
            const chainIdA = deployInfo[net1].chainId
            const userFrom = userNet3
            const userTo = userNet1

            await this.tokenC1.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })
            if (process.env.SET_TEST_ENVIROMENT != 'testnet'){
                await this.tokenC1.mint(userNet3, amount, { from: userNet3, gas: 300_000 })
                await this.routerC.setTrustedWorker(userNet3, { from: userNet3, gas: 300_000 })
            }

            await this.routerC.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userTo,
                {
                    receiveSide: receiveSideA,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdA,
                },

                { from: userNet3, gas: gasAmount }
            )
            await timeout(waitDuration)
            const newBalance = await this.synthA.balanceOf(userNet1)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize: network3 -> network2", async function () {
            this.tokenC1 = await ERC20C.at(process.env.SET_TEST_ENVIROMENT === 'testnet' ? deployInfo[net3].token[1].address : deployInfo[net3].localToken[0].address)
            this.routerC = await RouterC.at(deployInfo[net3].router)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(this.tokenC1.address))
            this.synthB = await SynthB.at(synthAddress)
            const oldBalance = await this.synthB.balanceOf(userNet2)
            const amount = ethers.utils.parseEther("0." + Math.floor(Math.random() * 100))

            const tokenToSynth = this.tokenC1.address
            const receiveSideB = deployInfo[net2].synthesis
            const oppositeBridge = deployInfo[net2].bridge
            const chainIdB = deployInfo[net2].chainId
            const userFrom = userNet3
            const userTo = userNet2

            await this.tokenC1.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })
            if (process.env.SET_TEST_ENVIROMENT != 'testnet'){
                await this.tokenC1.mint(userNet3, amount, { from: userNet3, gas: 300_000 })
                await this.routerC.setTrustedWorker(userNet3, { from: userNet3, gas: 300_000 })
            }

            await this.routerC.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userTo,
                {
                    receiveSide: receiveSideB,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdB,
                },

                { from: userNet3, gas: gasAmount }
            )
            await timeout(waitDuration)
            const newBalance = await this.synthB.balanceOf(userNet2)
            assert(oldBalance.lt(newBalance))
        })
    })
})
