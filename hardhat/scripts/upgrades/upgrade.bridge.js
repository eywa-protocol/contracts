const { upgrades, ethers, network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');

contract('Contracts upgrade', () => {

    describe("", () => {

        it("Bridge upgrade", async function () {
            const _BridgeV2 = await ethers.getContractFactory("Bridge")

            let bridge = deployInfo[network.name].bridge
            const bridgeV2 = await upgrades.upgradeProxy(bridge, _BridgeV2)
        })

    })
})