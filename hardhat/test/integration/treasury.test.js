let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { checkoutProvider, timeout } = require("../../utils/helper");
const { ethers } = require("hardhat");
const { assert } = require("chai");

contract('Treasury', () => {

    describe("treasury local test", () => {

        before(async () => {
            ERC20B = artifacts.require('ERC20Mock')

            TreasuryB = artifacts.require('Treasury')

            factoryProvider = checkoutProvider({ 'typenet': 'devstand', 'net1': 'network1', 'net2': 'network2', 'net3': 'network3' })
            totalSupply = ethers.constants.MaxUint256

            ERC20B.setProvider(factoryProvider.web3Net2)

            TreasuryB.setProvider(factoryProvider.web3Net2)

            tokenB = await ERC20B.at(deployInfo["network2"].localToken[0].address)

            treasuryB = await TreasuryB.at(deployInfo["network2"].treasury)

            userNet2 = (await TreasuryB.web3.eth.getAccounts())[0];

            amount = ethers.utils.parseEther((Math.floor((Math.random() * 100) + 1)) + ".0")

        })


        it("WithdrawToken", async function () {

            const oldBalance = await tokenB.balanceOf(userNet2)
            
            await tokenB.mint(treasuryB.address, amount, { from: userNet2, gas: 1000_000 })

            await treasuryB.withdrawToken(
                tokenB.address,
                amount,
                userNet2,
                { from: userNet2, gas: 1000_000 }
            )

            const newBalance = await tokenB.balanceOf(userNet2)
            assert(oldBalance.lt(newBalance))
        })

        it("WithdrawNative", async function () {

            await TreasuryB.web3.eth.sendTransaction({
                to:treasuryB.address,
                value:ethers.utils.parseEther("1.0"),
                from:userNet2
            })

            const oldBalance = await TreasuryB.web3.eth.getBalance(treasuryB.address)

            await treasuryB.withdrawNative(
                ethers.utils.parseEther("1.0"),
                userNet2,
                { from: userNet2, gas: 1000_000 }
            )

            const newBalance = await TreasuryB.web3.eth.getBalance(treasuryB.address)
            assert(oldBalance > newBalance)
        })
    })
})