let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, addressToBytes32, timeout, signWorkerPermit } = require("../../utils/helper");
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

            amount = ethers.utils.parseEther(Math.floor((Math.random() * 10) + 1) + ".0")

        })

        it("Unsynthsize: network2 -> network1 ", async function () {
            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthB = await SynthB.at(synthAddress)
            this.oldBalance = await this.synthB.balanceOf(userNet2)
            const tokenToSynth = this.tokenA1.address
            const receiveSideB = deployInfo["network2"].synthesis
            const oppositeBridge = deployInfo["network2"].bridge
            const chainIdB = deployInfo["network2"].chainId

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })

            await this.routerA.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                {
                    to: userNet2,
                    receiveSide: receiveSideB,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdB,
                },
                { from: userNet1, gas: 1000_000 }
            )

            await timeout(15000)
            await this.synthB.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })

            const executionHash = await this.routerB._UNSYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userFrom = userNet2
            const userTo = userNet1
            const userNonce = await this.routerB.nonces(userFrom)
            const chainIdFrom = deployInfo["network2"].chainId
            const chainIdTo = deployInfo["network1"].chainId
            const signerUserNet2 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK2)

            const workerSignature = await signWorkerPermit(
                signerUserNet2,
                this.routerB.address,
                workerExecutionPrice,
                executionHash,
                chainIdFrom,
                chainIdTo,
                userNonce,
                workerDeadline
            )
                console.log(parseInt(await this.synthB.balanceOf(userNet2)))
            await this.routerB.unsynthesizeRequestPayNative(
                this.synthB.address,
                amount,
                userNet1,
                deployInfo["network1"].portal,
                deployInfo["network1"].bridge,
                deployInfo["network1"].chainId,
                {
                    executionPrice: workerExecutionPrice,
                    deadline: workerDeadline,
                    v: workerSignature.v,
                    r: workerSignature.r,
                    s: workerSignature.s
                },
                { from: userNet2, gas: 1000_000, value:workerExecutionPrice  }
            )
            await timeout(15000)
            const newBalance = await this.synthB.balanceOf(userNet2)
            assert(this.oldBalance.eq(newBalance))    
        })

    })
})
