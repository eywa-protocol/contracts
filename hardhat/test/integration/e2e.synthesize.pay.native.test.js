let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, addressToBytes32, timeout, chainId } = require("../../utils/helper");
const { ethers } = require("hardhat");

contract('Router', () => {

    describe("synthesize local test", () => {
        const splitSignatureToRSV = (signature) => {
            const r = '0x' + signature.substring(2).substring(0, 64);
            const s = '0x' + signature.substring(2).substring(64, 128);
            const v = parseInt(signature.substring(2).substring(128, 130), 16);
            return { r, s, v };
        }

        const signWithEthers = async (signer, fromAddress, typeData) => {
            const signerAddress = await signer.getAddress();
            if (signerAddress.toLowerCase() !== fromAddress.toLowerCase()) {
                throw new Error('Signer address does not match requested signing address');
            }

            const { EIP712Domain: _unused, ...types } = typeData.types;
            const rawSignature = await (signer.signTypedData
                ? signer.signTypedData(typeData.domain, types, typeData.message)
                : signer._signTypedData(typeData.domain, types, typeData.message));
            // console.log(rawSignature)
            return splitSignatureToRSV(rawSignature);
        }

        const signData = async (signer, fromAddress, typeData) => {
            let provider = ethers.providers.Provider

            // console.log(signerUserNet1)
            // await userNet1.signTypedData(typeData);
            // console.log(provider.isSigner())
            if (signer._signTypedData || signer.signTypedData) {
                return signWithEthers(signer, fromAddress, typeData);
            }
        }

        const EIP712Domain = [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
        ];

        const getDomain = async (token) => {
            return {
                name: "EYWA",
                version: "1",
                chainId: "1111",
                verifyingContract: token
            }

        }

        const createTypedData = (message /*DaiPermitMessage*/, domain /*Domain*/) => {
            const typedData = {
                types: {
                    EIP712Domain,
                    Permit: [
                        { name: "from", type: "address" },
                        { name: "chainIdTo", type: "uint256" },
                        { name: "executionPrice", type: "uint256" },
                        { name: "executionHash", type: "bytes32" },
                        { name: "nonce", type: "uint256" },
                        { name: "deadline", type: "uint256" },
                    ],
                },
                primaryType: "DelegatedCallWorkerPermit",
                domain,
                message,
            };

            return typedData;
        };


        const signWorkerPermitTest = async (
            signer,
            contract,
            from,
            chainIdTo,
            executionPrice,
            executionHash,
            nonce,
            deadline
        ) => {
            // const token = contract

            const message = {
                from,
                chainIdTo,
                executionPrice,
                executionHash,
                nonce,
                deadline
            };

            const domain = await getDomain(contract);
            const typedData = createTypedData(message, domain); //console.log(typedData)
            const sig = await signData(signer, from, typedData);

            return { ...sig, ...message };
        };

        async function signWorkerPermit(
            userFrom,
            verifyingContract,
            workerExecutionPrice,
            executionHash,
            chainIdFrom,
            chainIdTo,
            userNonce,
            workerDeadline
        ) {
            const hashedName = ethers.utils.solidityKeccak256(
                ['string'],
                ["EYWA"]
            );
            const hashedVersion = ethers.utils.solidityKeccak256(
                ['string'],
                ["1"]
            );

            const typeHash = ethers.utils.solidityKeccak256(
                ['string'],
                ["EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"]
            );

            const domainSeparator = web3.eth.abi.encodeParameters(
                ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
                [typeHash, hashedName, hashedVersion, chainIdFrom, verifyingContract]
            );

            const domainSeparatorHash = ethers.utils.solidityKeccak256(
                ['bytes'],
                [domainSeparator]
            );

            const delegatedCallWorkerPermitHash = ethers.utils.solidityKeccak256(
                ['string'],
                ["DelegatedCallWorkerPermit(address from,uint256 chainIdTo,uint256 executionPrice,bytes32 executionHash,uint256 nonce,uint256 deadline)"]
            );

            const workerStructHash = ethers.utils.solidityKeccak256(
                ['bytes32', 'address', 'uint256', 'uint256', 'bytes32', 'uint256', 'uint256'],
                [delegatedCallWorkerPermitHash, userFrom.address, chainIdTo, workerExecutionPrice, executionHash, userNonce.toString(), workerDeadline]
            );

            const workerMsgHash = ethers.utils.solidityKeccak256(
                ['string', 'bytes32', 'bytes32'],
                ['\x19\x01', domainSeparatorHash, workerStructHash]
            );
            return ethers.utils.splitSignature(await userFrom.signMessage(ethers.utils.arrayify(workerMsgHash)));
        }

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

        })

        it("Synthesize (pay native): network1 -> network2(hub)", async function () {
            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo["network1"].router)
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
            await this.tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })

            const executionHash = await this.routerA._SYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userNonce = await this.routerA.nonces(userFrom)
            const signerUserNet1 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK1)
            // console.log(await this.routerA._trustedWorker(userNet1))
            // const signerUserNet1 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK1)
            // console.log({signerUserNet1, contract:this.routerA.address, userFrom, workerExecutionPrice, executionHash, userNonce, workerDeadline})
            // const workerSig = await signWorkerPermit(signerUserNet1, this.routerA.address, userFrom, chainIdTo, workerExecutionPrice, executionHash, userNonce.toString(), workerDeadline)
            // console.log(workerSig)
            // console.log("ow", owner.address)

            const workerSignature = await signWorkerPermit(
                signerUserNet1,
                this.routerA.address,
                workerExecutionPrice,
                executionHash,
                chainIdFrom,
                chainIdTo,
                userNonce,
                workerDeadline
            )

            expect(await this.routerA.tokenSynthesizeRequestPayNative(
                tokenToSynth,
                amount,
                {
                    to: userTo,
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
            )).to.emit(this.routerA.address, 'CrosschainPaymentEvent').withArgs(userNet1, userNet1, workerExecutionPrice);
            
            await timeout(15000)
            const newBalance = await this.synthB.balanceOf(userNet2)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize (pay native): network1 -> network3", async function () {
            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            this.routerA = await RouterA.at(deployInfo["network1"].router)
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
            await this.tokenA1.approve(this.routerA.address, amount, { from: userNet1, gas: 300_000 })
            await this.routerA.setTrustedWorker(userNet1, { from: userNet1, gas: 300_000 })

            const executionHash = await this.routerA._SYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userNonce = await this.routerA.nonces(userFrom)
            const signerUserNet1 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK1)

            const workerSignature = await signWorkerPermit(
                signerUserNet1,
                this.routerA.address,
                workerExecutionPrice,
                executionHash,
                chainIdFrom,
                chainIdTo,
                userNonce,
                workerDeadline
            )

            expect(await this.routerA.tokenSynthesizeRequestPayNative(
                tokenToSynth,
                amount,
                {
                    to: userTo,
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
            )).to.emit(this.routerA.address, 'CrosschainPaymentEvent').withArgs(userNet1, userNet1, workerExecutionPrice);
            
            await timeout(15000)
            const newBalance = await this.synthC.balanceOf(userNet3)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize (pay native): network2 -> network3", async function () {
            this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            this.routerA = await RouterB.at(deployInfo["network2"].router)
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
            await this.tokenB1.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })
            await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })

            const executionHash = await this.routerB._SYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userNonce = await this.routerB.nonces(userFrom)
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

            expect(await this.routerB.tokenSynthesizeRequestPayNative(
                tokenToSynth,
                amount,
                {
                    to: userTo,
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
            )).to.emit(this.routerB.address, 'CrosschainPaymentEvent').withArgs(userNet2, userNet2, workerExecutionPrice);
            
            await timeout(15000)
            const newBalance = await this.synthC.balanceOf(userNet3)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize (pay native): network2 -> network1", async function () {
            this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            this.routerA = await RouterB.at(deployInfo["network2"].router)
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
            await this.tokenB1.approve(this.routerB.address, amount, { from: userNet2, gas: 300_000 })
            await this.routerB.setTrustedWorker(userNet2, { from: userNet2, gas: 300_000 })

            const executionHash = await this.routerB._SYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userNonce = await this.routerB.nonces(userFrom)
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

            expect(await this.routerB.tokenSynthesizeRequestPayNative(
                tokenToSynth,
                amount,
                {
                    to: userTo,
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
            )).to.emit(this.routerB.address, 'CrosschainPaymentEvent').withArgs(userNet2, userNet2, workerExecutionPrice);
            
            await timeout(15000)
            const newBalance = await this.synthA.balanceOf(userNet1)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize (pay native): network3 -> network1", async function () {
            this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
            this.routerA = await RouterC.at(deployInfo["network3"].router)
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
            await this.tokenC1.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })
            await this.routerC.setTrustedWorker(userNet3, { from: userNet3, gas: 300_000 })

            const executionHash = await this.routerC._SYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userNonce = await this.routerC.nonces(userFrom)
            const signerUserNet3 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK3)

            const workerSignature = await signWorkerPermit(
                signerUserNet3,
                this.routerC.address,
                workerExecutionPrice,
                executionHash,
                chainIdFrom,
                chainIdTo,
                userNonce,
                workerDeadline
            )

            expect(await this.routerC.tokenSynthesizeRequestPayNative(
                tokenToSynth,
                amount,
                {
                    to: userTo,
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
            )).to.emit(this.routerC.address, 'CrosschainPaymentEvent').withArgs(userNet3, userNet3, workerExecutionPrice);
            
            await timeout(15000)
            const newBalance = await this.synthA.balanceOf(userNet1)
            assert(oldBalance.lt(newBalance))
        })

        it("Synthesize (pay native): network3 -> network2", async function () {
            this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
            this.routerA = await RouterC.at(deployInfo["network3"].router)
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
            await this.tokenC1.approve(this.routerC.address, amount, { from: userNet3, gas: 300_000 })
            await this.routerC.setTrustedWorker(userNet3, { from: userNet3, gas: 300_000 })

            const executionHash = await this.routerC._SYNTHESIZE_REQUEST_SIGNATURE_HASH()
            const workerExecutionPrice = ethers.utils.parseEther("1.0")
            const workerDeadline = "100000000000"
            const userNonce = await this.routerC.nonces(userFrom)
            const signerUserNet3 = new ethers.Wallet(process.env.PRIVATE_KEY_NETWORK3)

            const workerSignature = await signWorkerPermit(
                signerUserNet3,
                this.routerC.address,
                workerExecutionPrice,
                executionHash,
                chainIdFrom,
                chainIdTo,
                userNonce,
                workerDeadline
            )

            expect(await this.routerC.tokenSynthesizeRequestPayNative(
                tokenToSynth,
                amount,
                {
                    to: userTo,
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
            )).to.emit(this.routerC.address, 'CrosschainPaymentEvent').withArgs(userNet3, userNet3, workerExecutionPrice);
            
            await timeout(15000)
            const newBalance = await this.synthB.balanceOf(userNet2)
            assert(oldBalance.lt(newBalance))
        })
    })
})
