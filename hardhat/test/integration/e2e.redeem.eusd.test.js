let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, timeout } = require("../../utils/helper");
const { ethers } = require("hardhat");

contract('CurveProxy', () => {

    describe("end-to-end local test", () => {

        before(async () => {
            ERC20A = artifacts.require('ERC20Mock')
            ERC20B = artifacts.require('ERC20Mock')
            ERC20C = artifacts.require('ERC20Mock')

            PortalA = artifacts.require('Portal')
            PortalB = artifacts.require('Portal')
            PortalC = artifacts.require('Portal')

            RouterA = artifacts.require('Router')
            RouterB = artifacts.require('Router')
            RouterC = artifacts.require('Router')

            CurveProxyA = artifacts.require('CurveProxy');
            CurveProxyB = artifacts.require('CurveProxy');
            CurveProxyC = artifacts.require('CurveProxy');

            StableSwap2Pool = artifacts.require('StableSwap2Pool')
            StableSwap3Pool = artifacts.require('StableSwap3Pool')

            factoryProvider = checkoutProvider({ 'typenet': 'devstand', 'net1': 'network1', 'net2': 'network2', 'net3': 'network3' })
            totalSupply = ethers.constants.MaxUint256

            CurveProxyA.setProvider(factoryProvider.web3Net1)
            CurveProxyB.setProvider(factoryProvider.web3Net2)
            CurveProxyC.setProvider(factoryProvider.web3Net3)

            RouterA.setProvider(factoryProvider.web3Net1)
            RouterB.setProvider(factoryProvider.web3Net2)
            RouterC.setProvider(factoryProvider.web3Net3)

            ERC20A.setProvider(factoryProvider.web3Net1)
            ERC20B.setProvider(factoryProvider.web3Net2)
            ERC20C.setProvider(factoryProvider.web3Net3)

            PortalA.setProvider(factoryProvider.web3Net1)
            PortalB.setProvider(factoryProvider.web3Net2)
            PortalC.setProvider(factoryProvider.web3Net3)

            userNet1 = (await CurveProxyA.web3.eth.getAccounts())[0];
            userNet2 = (await CurveProxyB.web3.eth.getAccounts())[0];
            userNet3 = (await CurveProxyC.web3.eth.getAccounts())[0];

        })

        it("Redeem EUSD: network2(hub) -> network1", async function () {

            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            this.routerC = await RouterC.at(deployInfo["network3"].router)
            this.tokenA1 = await ERC20A.at(deployInfo["network1"].localToken[0].address)
            this.tokenA2 = await ERC20A.at(deployInfo["network1"].localToken[1].address)
            this.tokenA3 = await ERC20A.at(deployInfo["network1"].localToken[2].address)
            this.EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)

            this.balanceA3 = await this.tokenA3.balanceOf(userNet1)

            //unsynthesize params
            const unsynthParams = {
                receiveSide: deployInfo["network1"].portal,
                oppositeBridge: deployInfo["network1"].bridge,
                chainId: deployInfo["network1"].chainId
            }

            const redeemEUSDParams = {
                removeAtCrosschainPool: deployInfo["network2"].crosschainPool[0].address,
                x: 2,
                expectedMinAmountC: 0,
                //hub pool params
                removeAtHubPool: deployInfo["network2"].hubPool.address,
                //amount to transfer
                tokenAmountH: ethers.utils.parseEther(Math.floor((Math.random() * 10) + 1) + ".0"), //test amount
                y: 0,
                expectedMinAmountH: 0,
                //recipient address
                to: userNet1
            }

            //unused in this case
            const permitParams = {
                v: 0,
                r: ethers.constants.HashZero,
                s: ethers.constants.HashZero,
                deadline: 0,
                approveMax: false
            }

            await this.EUSD.approve(this.routerB.address, totalSupply, { from: userNet2, gas: 300_000 });

            await this.routerB.redeemEusdRequest(
                redeemEUSDParams,
                permitParams,
                this.EUSD.address,
                unsynthParams.receiveSide,
                unsynthParams.oppositeBridge,
                unsynthParams.chainId,
                { from: userNet2, gas: 1000_000 }
            )

            await timeout(15000)
            assert(this.balanceA3.lt(await this.tokenA3.balanceOf(userNet1)))
        })

        it("Redeem EUSD: network2(hub) -> network3", async function () {
            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            this.routerC = await RouterC.at(deployInfo["network3"].router)
            this.tokenC1 = await ERC20C.at(deployInfo["network3"].localToken[0].address)
            this.tokenC2 = await ERC20C.at(deployInfo["network3"].localToken[1].address)
            this.tokenC3 = await ERC20C.at(deployInfo["network3"].localToken[2].address)
            this.EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)

            this.balanceC3 = await this.tokenC3.balanceOf(userNet3)

            //unsynthesize params
            const unsynthParams = {
                receiveSide: deployInfo["network3"].portal,
                oppositeBridge: deployInfo["network3"].bridge,
                chainId: deployInfo["network3"].chainId
            }

            const redeemEUSDParams = {
                removeAtCrosschainPool: deployInfo["network2"].crosschainPool[1].address,
                x: 2,
                expectedMinAmountC: 0,
                //hub pool params
                removeAtHubPool: deployInfo["network2"].hubPool.address,
                //amount to transfer
                tokenAmountH: ethers.utils.parseEther(Math.floor((Math.random() * 10) + 1) + ".0"), //test amount
                y: 1,
                expectedMinAmountH: 0,
                //recipient address
                to: userNet3
            }

            //unused in this case
            const permitParams = {
                v: 0,
                r: ethers.constants.HashZero,
                s: ethers.constants.HashZero,
                deadline: 0,
                approveMax: false
            }

            await this.EUSD.approve(this.routerB.address, totalSupply, { from: userNet2, gas: 300_000 });

            await this.routerB.redeemEusdRequest(
                redeemEUSDParams,
                permitParams,
                this.EUSD.address,
                unsynthParams.receiveSide,
                unsynthParams.oppositeBridge,
                unsynthParams.chainId,
                { from: userNet2, gas: 1000_000 }
            )

            await timeout(15000)
            assert(this.balanceC3.lt(await this.tokenC3.balanceOf(userNet3)))
        })

        it("Redeem EUSD: network2(hub) -> network2(hub)", async function () {
            this.routerA = await RouterA.at(deployInfo["network1"].router)
            this.routerB = await RouterB.at(deployInfo["network2"].router)
            this.routerC = await RouterC.at(deployInfo["network3"].router)
            this.tokenB1 = await ERC20B.at(deployInfo["network2"].localToken[0].address)
            this.tokenB2 = await ERC20B.at(deployInfo["network2"].localToken[1].address)
            this.tokenB3 = await ERC20B.at(deployInfo["network2"].localToken[2].address)
            this.EUSD = await ERC20B.at(deployInfo["network2"].hubPool.lp)

            this.balanceB3 = await this.tokenB3.balanceOf(userNet2)

            //unsynthesize params (empty in this case)
            const unsynthParams = {
                receiveSide: ethers.constants.AddressZero,
                oppositeBridge: ethers.constants.AddressZero,
                chainId: 0
            }

            //unused in this case
            const permitParams = {
                v: 0,
                r: ethers.constants.HashZero,
                s: ethers.constants.HashZero,
                deadline: 0,
                approveMax: false
            }

            const redeemEUSDParams = {
                removeAtCrosschainPool: deployInfo["network2"].localPool.address,
                x: 2,
                expectedMinAmountC: 0,
                //hub pool params
                removeAtHubPool: deployInfo["network2"].hubPool.address,
                //amount to transfer
                tokenAmountH: ethers.utils.parseEther(Math.floor((Math.random() * 10) + 1) + ".0"), //test amount
                y: 2,
                expectedMinAmountH: 0,
                //recipient address
                to: userNet2
            }

            await this.EUSD.approve(this.routerB.address, totalSupply, { from: userNet2, gas: 300_000 });

            await this.routerB.redeemEusdRequest(
                redeemEUSDParams,
                permitParams,
                this.EUSD.address,
                unsynthParams.receiveSide,
                unsynthParams.oppositeBridge,
                unsynthParams.chainId,
                { from: userNet2, gas: 1000_000 }
            )

            await timeout(15000)
            assert(this.balanceB3.lt(await this.tokenB3.balanceOf(userNet2)))
        })
    })
})