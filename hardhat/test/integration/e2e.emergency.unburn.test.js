let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, addressToBytes32, timeout, getTxId } = require("../../utils/helper"); 
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

            PortalA = artifacts.require('Portal')
            PortalB = artifacts.require('Portal')
            PortalC = artifacts.require('Portal')

            BridgeA = artifacts.require('Bridge')
            BridgeB = artifacts.require('Bridge')
            BridgeC = artifacts.require('Bridge')

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

            BridgeA.setProvider(factoryProvider.web3Net1)
            BridgeB.setProvider(factoryProvider.web3Net2)
            BridgeC.setProvider(factoryProvider.web3Net3)

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

            bridgeA = await BridgeA.at(deployInfo["network1"].bridge)
            bridgeB = await BridgeB.at(deployInfo["network2"].bridge)
            bridgeC = await BridgeC.at(deployInfo["network3"].bridge)

            SynthA.setProvider(factoryProvider.web3Net1)
            SynthB.setProvider(factoryProvider.web3Net2)
            SynthC.setProvider(factoryProvider.web3Net3)

            signerUserNet1 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK1)
            signerUserNet2 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK2)
            signerUserNet3 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK3)

        })

        it("Emergency Unburn: network1 -> network2(hub)", async function () {
            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            this.portalA = await PortalA.at(deployInfo["network1"].portal)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthB = await SynthB.at(synthAddress)
            const oldBalance = await this.synthB.balanceOf(userNet2)
            const amount = ethers.utils.parseEther("0.5")
            
            const tokenToSynth = this.tokenA1.address
            const receiveSideB = deployInfo["network2"].synthesis
            const oppositeBridge = deployInfo["network2"].bridge
            const chainIdB = deployInfo["network2"].chainId
            const chainIdA = deployInfo["network1"].chainId
            const userFrom = userNet1
            const userTo = userNet2

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })
            await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })
            await this.synthB.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })

            await this.routerA.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userFrom,
                {
                    to: userTo,
                    receiveSide: receiveSideB,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdB,
                },
                
                { from: userNet1, gas: 1000_000 }
            )
            await timeout(15000)

            const nonce = await bridgeB.getNonce(userNet2);

            await this.routerB.unsynthesizeRequest(
                synthAddress,
                amount,
                userNet2,
                userNet1,
                deployInfo["network1"].synthesis,
                deployInfo["network1"].bridge,
                deployInfo["network1"].chainId,
                { from: userNet2, gas: 1000_000 }
            )

            const txID = getTxId(userNet2, nonce, chainIdA, chainIdB, deployInfo["network1"].synthesis, deployInfo["network1"].bridge)

            const emergencyHash = ethers.utils.solidityKeccak256(
                ['bytes32', 'address', 'uint256', 'string'],
                [txID, userNet1, chainIdB,"emergencyUnburn(bytes32,address,uint8,bytes32,bytes32)"]
            );

            const unburnSig = ethers.utils.splitSignature(await signerUserNet2.signMessage(ethers.utils.arrayify(emergencyHash)));

            await this.portalA.emergencyUnburnRequest(
                txID,
                deployInfo["network2"].synthesis,
                deployInfo["network2"].bridge,
                deployInfo["network2"].chainId,
                unburnSig.v,
                unburnSig.r,
                unburnSig.s,
                { from: userNet1, gas: 1000_000 }
            )
            await timeout(15000)
            const newBalance = await this.synthB.balanceOf(userNet2)
            console.log(newBalance.toString())
            console.log((await this.tokenA1.balanceOf(userNet1)).toString())
            assert(oldBalance.lt(newBalance))    
        })

        it("Emergency Unburn: network1 -> network3", async function () {

            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerC = await RouterC.at(deployInfo["network3"].router)
            this.portalA = await PortalA.at(deployInfo["network1"].portal)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(this.tokenA1.address))
            this.synthC = await SynthC.at(synthAddress)
            const oldBalance = await this.synthC.balanceOf(userNet3)
            const amount = ethers.utils.parseEther("0.5")

            const tokenToSynth = this.tokenA1.address
            const receiveSideC = deployInfo["network3"].synthesis
            const oppositeBridge = deployInfo["network3"].bridge
            const chainIdA = deployInfo["network1"].chainId
            const chainIdC = deployInfo["network3"].chainId
            const userFrom = userNet1
            const userTo = userNet3

            await this.tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await this.tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })
            await this.synthC.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })

            await this.routerA.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userFrom,
                {
                    to: userTo,
                    receiveSide: receiveSideC,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdC,
                },
                
                { from: userNet1, gas: 1000_000 }
            )
            await timeout(15000)

            const nonce = await bridgeC.getNonce(userNet3);

            await this.routerC.unsynthesizeRequest(
                synthAddress,
                amount,
                userNet3,
                userNet1,
                deployInfo["network1"].synthesis,
                deployInfo["network1"].bridge,
                deployInfo["network1"].chainId,
                { from: userNet3, gas: 1000_000 }
            )

            const txID = getTxId(userNet3, nonce, chainIdA, chainIdC, deployInfo["network1"].synthesis, deployInfo["network1"].bridge)

            const emergencyHash = ethers.utils.solidityKeccak256(
                ['bytes32', 'address', 'uint256', 'string'],
                [txID, userNet1, chainIdC,"emergencyUnburn(bytes32,address,uint8,bytes32,bytes32)"]
            );

            const unburnSig = ethers.utils.splitSignature(await signerUserNet3.signMessage(ethers.utils.arrayify(emergencyHash)));

            await this.portalA.emergencyUnburnRequest(
                txID,
                deployInfo["network3"].synthesis,
                deployInfo["network3"].bridge,
                deployInfo["network3"].chainId,
                unburnSig.v,
                unburnSig.r,
                unburnSig.s,
                { from: userNet1, gas: 1000_000 }
            )
            await timeout(15000)

            const newBalance = await this.synthC.balanceOf(userNet3)
            assert(oldBalance.lt(newBalance))
        })

        it("Emergency Unburn: network2 -> network1", async function () {

            this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            this.portalB = await PortalB.at(deployInfo["network2"].portal)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(this.tokenB1.address))
            this.synthA = await SynthA.at(synthAddress)
            const oldBalance = await this.synthA.balanceOf(userNet1)
            const amount = ethers.utils.parseEther("0.5")

            const tokenToSynth = this.tokenB1.address
            const receiveSideA = deployInfo["network1"].synthesis
            const oppositeBridge = deployInfo["network1"].bridge
            const chainIdA = deployInfo["network1"].chainId
            const chainIdB = deployInfo["network2"].chainId
            const userFrom = userNet2
            const userTo = userNet1

            await this.tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
            await this.tokenB1.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })
            await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })
            await this.synthA.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })

            await this.routerB.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userFrom,
                {
                    to: userTo,
                    receiveSide: receiveSideA,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdA,
                },
                
                { from: userNet2, gas: 1000_000 }
            )
            await timeout(15000)

            const nonce = await bridgeA.getNonce(userNet1);

            await this.routerA.unsynthesizeRequest(
                synthAddress,
                amount,
                userNet1,
                userNet2,
                deployInfo["network2"].synthesis,
                deployInfo["network2"].bridge,
                deployInfo["network2"].chainId,
                { from: userNet1, gas: 1000_000 }
            )

            const txID = getTxId(userNet1, nonce, chainIdB, chainIdA, deployInfo["network2"].synthesis, deployInfo["network2"].bridge)

            const emergencyHash = ethers.utils.solidityKeccak256(
                ['bytes32', 'address', 'uint256', 'string'],
                [txID, userNet2, chainIdA,"emergencyUnburn(bytes32,address,uint8,bytes32,bytes32)"]
            );

            const unburnSig = ethers.utils.splitSignature(await signerUserNet1.signMessage(ethers.utils.arrayify(emergencyHash)));

            await this.portalB.emergencyUnburnRequest(
                txID,
                deployInfo["network1"].synthesis,
                deployInfo["network1"].bridge,
                deployInfo["network1"].chainId,
                unburnSig.v,
                unburnSig.r,
                unburnSig.s,
                { from: userNet2, gas: 1000_000 }
            )
            await timeout(15000)

            const newBalance = await this.synthA.balanceOf(userNet1)
            assert(oldBalance.lt(newBalance))
        })

        it("Emergency Unburn: network2 -> network3", async function () {

            this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            this.routerC = await RouterC.at(deployInfo["network3"].router)
            this.portalB = await PortalB.at(deployInfo["network2"].portal)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(this.tokenB1.address))
            this.synthC = await SynthC.at(synthAddress)
            const oldBalance = await this.synthC.balanceOf(userNet3)
            const amount = ethers.utils.parseEther("0.5")

            const tokenToSynth = this.tokenB1.address
            const receiveSideC = deployInfo["network3"].synthesis
            const oppositeBridge = deployInfo["network3"].bridge
            const chainIdC = deployInfo["network3"].chainId
            const chainIdB = deployInfo["network2"].chainId
            const userFrom = userNet2
            const userTo = userNet3

            await this.tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
            await this.tokenB1.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })
            await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })
            await this.synthC.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })

            await this.routerB.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userFrom,
                {
                    to: userTo,
                    receiveSide: receiveSideC,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdC,
                },
                
                { from: userNet2, gas: 1000_000 }
            )
            await timeout(15000)

            const nonce = await bridgeC.getNonce(userNet3);

            await this.routerC.unsynthesizeRequest(
                synthAddress,
                amount,
                userNet3,
                userNet2,
                deployInfo["network2"].synthesis,
                deployInfo["network2"].bridge,
                deployInfo["network2"].chainId,
                { from: userNet3, gas: 1000_000 }
            )

            const txID = getTxId(userNet3, nonce, chainIdB, chainIdC, deployInfo["network2"].synthesis, deployInfo["network2"].bridge)

            const emergencyHash = ethers.utils.solidityKeccak256(
                ['bytes32', 'address', 'uint256', 'string'],
                [txID, userNet2, chainIdC,"emergencyUnburn(bytes32,address,uint8,bytes32,bytes32)"]
            );

            const unburnSig = ethers.utils.splitSignature(await signerUserNet3.signMessage(ethers.utils.arrayify(emergencyHash)));

            await this.portalB.emergencyUnburnRequest(
                txID,
                deployInfo["network3"].synthesis,
                deployInfo["network3"].bridge,
                deployInfo["network3"].chainId,
                unburnSig.v,
                unburnSig.r,
                unburnSig.s,
                { from: userNet2, gas: 1000_000 }
            )
            await timeout(15000)

            const newBalance = await this.synthC.balanceOf(userNet3)
            assert(oldBalance.lt(newBalance))
        })

        it("Emergency Unburn: network3 -> network1", async function () {

            this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
            this.routerC = await RouterC.at(deployInfo["network3"].router)
            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.portalC = await PortalC.at(deployInfo["network3"].portal)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(this.tokenC1.address))
            this.synthA = await SynthA.at(synthAddress)
            const oldBalance = await this.synthA.balanceOf(userNet1)
            const amount = ethers.utils.parseEther("0.5")

            const tokenToSynth = this.tokenC1.address
            const receiveSideA = deployInfo["network1"].synthesis
            const oppositeBridge = deployInfo["network1"].bridge
            const chainIdA = deployInfo["network1"].chainId
            const chainIdC = deployInfo["network3"].chainId
            const userFrom = userNet3
            const userTo = userNet1

            await this.tokenC1.mint(userNet3, amount, { from: userNet3, gas: 300_000 })
            await this.tokenC1.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })
            await this.routerC.setTrustedWorker(userNet3, { from: userNet3, gas: 300_000 })
            await this.synthA.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })

            await this.routerC.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userFrom,
                {
                    to: userTo,
                    receiveSide: receiveSideA,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdA,
                },
                
                { from: userNet3, gas: 1000_000 }
            )
            await timeout(15000)

            const nonce = await bridgeA.getNonce(userNet1);

            await this.routerA.unsynthesizeRequest(
                synthAddress,
                amount,
                userNet1,
                userNet3,
                deployInfo["network3"].synthesis,
                deployInfo["network3"].bridge,
                deployInfo["network3"].chainId,
                { from: userNet1, gas: 1000_000 }
            )

            const txID = getTxId(userNet1, nonce, chainIdC, chainIdA, deployInfo["network3"].synthesis, deployInfo["network3"].bridge)

            const emergencyHash = ethers.utils.solidityKeccak256(
                ['bytes32', 'address', 'uint256', 'string'],
                [txID, userNet3, chainIdA,"emergencyUnburn(bytes32,address,uint8,bytes32,bytes32)"]
            );

            const unburnSig = ethers.utils.splitSignature(await signerUserNet1.signMessage(ethers.utils.arrayify(emergencyHash)));

            await this.portalC.emergencyUnburnRequest(
                txID,
                deployInfo["network1"].synthesis,
                deployInfo["network1"].bridge,
                deployInfo["network1"].chainId,
                unburnSig.v,
                unburnSig.r,
                unburnSig.s,
                { from: userNet3, gas: 1000_000 }
            )
            await timeout(15000)

            const newBalance = await this.synthA.balanceOf(userNet1)
            assert(oldBalance.lt(newBalance))
        })

        it("Emergency Unburn: network3 -> network2", async function () {
            this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
            this.routerC = await RouterC.at(deployInfo["network3"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            this.portalC = await PortalC.at(deployInfo["network3"].portal)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(this.tokenC1.address))
            this.synthB = await SynthB.at(synthAddress)
            const oldBalance = await this.synthB.balanceOf(userNet2)
            const amount = ethers.utils.parseEther("0.5")
            
            const tokenToSynth = this.tokenC1.address
            const receiveSideB = deployInfo["network2"].synthesis
            const oppositeBridge = deployInfo["network2"].bridge
            const chainIdB = deployInfo["network2"].chainId
            const chainIdC = deployInfo["network3"].chainId
            const userFrom = userNet3
            const userTo = userNet2

            await this.tokenC1.mint(userNet3, amount, { from: userNet3, gas: 300_000 })
            await this.tokenC1.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })
            await this.routerC.setTrustedWorker(userNet3, { from: userNet3, gas: 300_000 })
            await this.synthB.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })

            await this.routerC.tokenSynthesizeRequest(
                tokenToSynth,
                amount,
                userFrom,
                {
                    to: userTo,
                    receiveSide: receiveSideB,
                    oppositeBridge: oppositeBridge,
                    chainId: chainIdB,
                },
                
                { from: userNet3, gas: 1000_000 }
            )
            await timeout(15000)

            const nonce = await bridgeB.getNonce(userNet2);

            await this.routerB.unsynthesizeRequest(
                synthAddress,
                amount,
                userNet2,
                userNet3,
                deployInfo["network3"].synthesis,
                deployInfo["network3"].bridge,
                deployInfo["network3"].chainId,
                { from: userNet2, gas: 1000_000 }
            )

            const txID = getTxId(userNet2, nonce, chainIdC, chainIdB, deployInfo["network3"].synthesis, deployInfo["network3"].bridge)

            const emergencyHash = ethers.utils.solidityKeccak256(
                ['bytes32', 'address', 'uint256', 'string'],
                [txID, userNet3, chainIdB,"emergencyUnburn(bytes32,address,uint8,bytes32,bytes32)"]
            );

            const unburnSig = ethers.utils.splitSignature(await signerUserNet2.signMessage(ethers.utils.arrayify(emergencyHash)));

            await this.portalC.emergencyUnburnRequest(
                txID,
                deployInfo["network2"].synthesis,
                deployInfo["network2"].bridge,
                deployInfo["network2"].chainId,
                unburnSig.v,
                unburnSig.r,
                unburnSig.s,
                { from: userNet3, gas: 1000_000 }
            )
            await timeout(15000)

            const newBalance = await this.synthB.balanceOf(userNet2)
            assert(oldBalance.lt(newBalance))
        })
    })
})