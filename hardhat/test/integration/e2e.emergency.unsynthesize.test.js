let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, addressToBytes32, timeout, getTxId } = require("../../utils/helper");
const { ethers } = require("hardhat");

contract('Synthesize', () => {

    describe("emergency unsynthesize local test", () => {

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

            synthesisA = await SynthesisA.at(deployInfo[net1].synthesis)
            synthesisB = await SynthesisB.at(deployInfo[net2].synthesis)
            synthesisC = await SynthesisC.at(deployInfo[net3].synthesis)

            SynthA = artifacts.require('SyntERC20')
            SynthB = artifacts.require('SyntERC20')
            SynthC = artifacts.require('SyntERC20')

            bridgeA = await BridgeA.at(deployInfo[net1].bridge)
            bridgeB = await BridgeB.at(deployInfo[net2].bridge)
            bridgeC = await BridgeC.at(deployInfo[net3].bridge)

            SynthA.setProvider(factoryProvider.web3Net1)
            SynthB.setProvider(factoryProvider.web3Net2)
            SynthC.setProvider(factoryProvider.web3Net3)

            amount = ethers.utils.parseEther("0." + Math.floor(Math.random() * 100))

            if (process.env.SET_TEST_ENVIROMENT === 'testnet') {
                signerUserNet1 = new ethers.Wallet(process.env.PRIVATE_KEY_MUMBAI)
                signerUserNet2 = new ethers.Wallet(process.env.PRIVATE_KEY_HARMONYTESTNET)
                signerUserNet3 = new ethers.Wallet(process.env.PRIVATE_KEY_BSCTESTNET)
            } else {
                signerUserNet1 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK1)
                signerUserNet2 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK2)
                signerUserNet3 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK3)
            }

            if (process.env.SET_TEST_ENVIROMENT === 'testnet') {
                tokenA1 = await ERC20A.at(deployInfo[net1].token[1].address)
                tokenB1 = await ERC20B.at(deployInfo[net2].token[1].address)
                tokenC1 = await ERC20C.at(deployInfo[net3].token[1].address)
            } else {
                tokenA1 = await ERC20A.at(deployInfo[net1].localToken[0].address)
                tokenB1 = await ERC20B.at(deployInfo[net2].localToken[0].address)
                tokenC1 = await ERC20C.at(deployInfo[net3].localToken[0].address)
            }
        })


        it("Emergency unsynthesize: network1 -> network2(hub)", async function () {
            this.routerA = await RouterA.at(deployInfo[net1].router)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(tokenA1.address))
            this.synthB = await SynthB.at(synthAddress)
            this.portalA = await PortalA.at(deployInfo[net1].portal)
            const oldBalance = await tokenA1.balanceOf(userNet1)
            
            const tokenToSynth = tokenA1.address
            const receiveSideB = deployInfo[net2].synthesis
            const oppositeBridge = deployInfo[net2].bridge
            const chainIdA = deployInfo[net1].chainId
            const chainIdB = deployInfo[net2].chainId
            const userFrom = userNet1
            const userTo = userNet2

            await tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })

            const nonce = await bridgeA.getNonce(userNet1);

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
            const txID = getTxId(userNet1, nonce, chainIdB, chainIdA, receiveSideB, oppositeBridge)

            const emergencyHash = ethers.utils.solidityKeccak256(
                ['bytes32', 'address', 'uint256', 'string'],
                [txID, userNet2, chainIdB, "emergencyUnsynthesize(bytes32,address,uint8,bytes32,bytes32)"]
            );

            const unsynthSig = ethers.utils.splitSignature(await signerUserNet1.signMessage(ethers.utils.arrayify(emergencyHash)));

            await synthesisB.emergencyUnsyntesizeRequest(
                txID,
                deployInfo[net1].portal,
                deployInfo[net1].bridge,
                deployInfo[net1].chainId,
                unsynthSig.v,
                unsynthSig.r,
                unsynthSig.s,
                { from: userNet2, gas: gasAmount }
            )

            await timeout(waitDuration)
            const newBalance = await tokenA1.balanceOf(userNet1)
            assert(oldBalance.eq(newBalance))
        })

        it("Emergency unsynthesize: network1 -> network3", async function () {
            this.routerA = await RouterA.at(deployInfo[net1].router)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(tokenA1.address))
            this.synthC = await SynthC.at(synthAddress)
            const oldBalance = await tokenA1.balanceOf(userNet1)
            

            const tokenToSynth = tokenA1.address
            const receiveSideC = deployInfo[net3].synthesis
            const oppositeBridge = deployInfo[net3].bridge
            const chainIdC = deployInfo[net3].chainId
            const chainIdA = deployInfo[net1].chainId
            const userFrom = userNet1
            const userTo = userNet3

            await tokenA1.mint(userNet1, amount, { from: userNet1, gas: 300_000 })
            await tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })

            const nonce = await bridgeA.getNonce(userNet1);

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

            const txID = getTxId(userNet1, nonce, chainIdC, chainIdA, receiveSideC, oppositeBridge)

            const emergencyHash = ethers.utils.solidityKeccak256(
                ['bytes32', 'address', 'uint256', 'string'],
                [txID, userNet3, chainIdC, "emergencyUnsynthesize(bytes32,address,uint8,bytes32,bytes32)"]
            );

            const unsynthSig = ethers.utils.splitSignature(await signerUserNet1.signMessage(ethers.utils.arrayify(emergencyHash)));

            await synthesisC.emergencyUnsyntesizeRequest(
                txID,
                deployInfo[net1].portal,
                deployInfo[net1].bridge,
                deployInfo[net1].chainId,
                unsynthSig.v,
                unsynthSig.r,
                unsynthSig.s,
                { from: userNet3, gas: gasAmount }
            )

            await timeout(waitDuration)
            const newBalance = await tokenA1.balanceOf(userNet1)
            assert(oldBalance.eq(newBalance))
        })

        it("Emergency unsynthesize: network2 -> network1", async function () {
            this.routerB = await RouterB.at(deployInfo[net2].router)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(tokenB1.address))
            this.synthA = await SynthA.at(synthAddress)
            const oldBalance = await tokenB1.balanceOf(userNet2)
            

            const tokenToSynth = tokenB1.address
            const receiveSideA = deployInfo[net1].synthesis
            const oppositeBridge = deployInfo[net1].bridge
            const chainIdA = deployInfo[net1].chainId
            const chainIdB = deployInfo[net2].chainId
            const userFrom = userNet2
            const userTo = userNet1

            await tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
            await tokenB1.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })
            await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })

            const nonce = await bridgeB.getNonce(userNet2);

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

            const txID = getTxId(userNet2, nonce, chainIdA, chainIdB, receiveSideA, oppositeBridge)

            const emergencyHash = ethers.utils.solidityKeccak256(
                ['bytes32', 'address', 'uint256', 'string'],
                [txID, userNet1, chainIdA, "emergencyUnsynthesize(bytes32,address,uint8,bytes32,bytes32)"]
            );

            const unsynthSig = ethers.utils.splitSignature(await signerUserNet2.signMessage(ethers.utils.arrayify(emergencyHash)));

            await synthesisA.emergencyUnsyntesizeRequest(
                txID,
                deployInfo[net2].portal,
                deployInfo[net2].bridge,
                deployInfo[net2].chainId,
                unsynthSig.v,
                unsynthSig.r,
                unsynthSig.s,
                { from: userNet1, gas: gasAmount }
            )

            await timeout(waitDuration)
            const newBalance = await tokenB1.balanceOf(userNet2)
            assert(oldBalance.eq(newBalance))
        })

        it("Emergency unsynthesize: network2 -> network3", async function () {
            this.routerB = await RouterB.at(deployInfo[net2].router)
            const synthAddress = await synthesisC.getRepresentation(addressToBytes32(tokenB1.address))
            this.synthB = await SynthC.at(synthAddress)
            const oldBalance = await tokenB1.balanceOf(userNet2)
            

            const tokenToSynth = tokenB1.address
            const receiveSideC = deployInfo[net3].synthesis
            const oppositeBridge = deployInfo[net3].bridge
            const chainIdC = deployInfo[net3].chainId
            const chainIdB = deployInfo[net2].chainId
            const userFrom = userNet2
            const userTo = userNet3

            await tokenB1.mint(userNet2, amount, { from: userNet2, gas: 300_000 })
            await tokenB1.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })
            await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })

            const nonce = await bridgeB.getNonce(userNet2);

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

            const txID = getTxId(userNet2, nonce, chainIdC, chainIdB, receiveSideC, oppositeBridge)

            const emergencyHash = ethers.utils.solidityKeccak256(
                ['bytes32', 'address', 'uint256', 'string'],
                [txID, userNet3, chainIdC, "emergencyUnsynthesize(bytes32,address,uint8,bytes32,bytes32)"]
            );

            const unsynthSig = ethers.utils.splitSignature(await signerUserNet2.signMessage(ethers.utils.arrayify(emergencyHash)));

            await synthesisC.emergencyUnsyntesizeRequest(
                txID,
                deployInfo[net2].portal,
                deployInfo[net2].bridge,
                deployInfo[net2].chainId,
                unsynthSig.v,
                unsynthSig.r,
                unsynthSig.s,
                { from: userNet3, gas: gasAmount }
            )

            await timeout(waitDuration)
            const newBalance = await tokenB1.balanceOf(userNet2)
            assert(oldBalance.eq(newBalance))
        })

        it("Emergency unsynthesize: network3 -> network1", async function () {
            this.routerC = await RouterC.at(deployInfo[net3].router)
            const synthAddress = await synthesisA.getRepresentation(addressToBytes32(tokenC1.address))
            this.synthA = await SynthA.at(synthAddress)
            const oldBalance = await tokenC1.balanceOf(userNet3)
            

            const tokenToSynth = tokenC1.address
            const receiveSideA = deployInfo[net1].synthesis
            const oppositeBridge = deployInfo[net1].bridge
            const chainIdA = deployInfo[net1].chainId
            const chainIdC = deployInfo[net3].chainId
            const userFrom = userNet3
            const userTo = userNet1

            await tokenC1.mint(userNet3, amount, { from: userNet3, gas: 300_000 })
            await tokenC1.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })
            await this.routerC.setTrustedWorker(userNet3, { from: userNet3, gas: 300_000 })

            const nonce = await bridgeC.getNonce(userNet3);

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

            const txID = getTxId(userNet3, nonce, chainIdA, chainIdC, receiveSideA, oppositeBridge)

            const emergencyHash = ethers.utils.solidityKeccak256(
                ['bytes32', 'address', 'uint256', 'string'],
                [txID, userNet1, chainIdA, "emergencyUnsynthesize(bytes32,address,uint8,bytes32,bytes32)"]
            );

            const unsynthSig = ethers.utils.splitSignature(await signerUserNet3.signMessage(ethers.utils.arrayify(emergencyHash)));

            await synthesisA.emergencyUnsyntesizeRequest(
                txID,
                deployInfo[net3].portal,
                deployInfo[net3].bridge,
                deployInfo[net3].chainId,
                unsynthSig.v,
                unsynthSig.r,
                unsynthSig.s,
                { from: userNet1, gas: gasAmount }
            )

            await timeout(waitDuration)
            const newBalance = await tokenC1.balanceOf(userNet3)
            assert(oldBalance.eq(newBalance))
        })

        it("Emergency unsynthesize: network3 -> network2", async function () {
            this.routerC = await RouterC.at(deployInfo[net3].router)
            const synthAddress = await synthesisB.getRepresentation(addressToBytes32(tokenC1.address))
            this.synthB = await SynthB.at(synthAddress)
            const oldBalance = await tokenC1.balanceOf(userNet3)
            

            const tokenToSynth = tokenC1.address
            const receiveSideB = deployInfo[net2].synthesis
            const oppositeBridge = deployInfo[net2].bridge
            const chainIdB = deployInfo[net2].chainId
            const chainIdC = deployInfo[net3].chainId
            const userFrom = userNet3
            const userTo = userNet2

            await tokenC1.mint(userNet3, amount, { from: userNet3, gas: 300_000 })
            await tokenC1.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })
            await this.routerC.setTrustedWorker(userNet3, { from: userNet3, gas: 300_000 })

            const nonce = await bridgeC.getNonce(userNet3);

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

            const txID = getTxId(userNet3, nonce, chainIdB, chainIdC, receiveSideB, oppositeBridge)

            const emergencyHash = ethers.utils.solidityKeccak256(
                ['bytes32', 'address', 'uint256', 'string'],
                [txID, userNet2, chainIdB, "emergencyUnsynthesize(bytes32,address,uint8,bytes32,bytes32)"]
            );

            const unsynthSig = ethers.utils.splitSignature(await signerUserNet3.signMessage(ethers.utils.arrayify(emergencyHash)));

            await synthesisB.emergencyUnsyntesizeRequest(
                txID,
                deployInfo[net3].portal,
                deployInfo[net3].bridge,
                deployInfo[net3].chainId,
                unsynthSig.v,
                unsynthSig.r,
                unsynthSig.s,
                { from: userNet2, gas: gasAmount }
            )

            await timeout(waitDuration)
            const newBalance = await tokenC1.balanceOf(userNet3)
            assert(oldBalance.eq(newBalance))
        })
    })
})
