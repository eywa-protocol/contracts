const { upgrades, ethers, network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');

contract('Contracts upgrade', () => {

    describe("", () => {

        it("Portal upgrade", async function () {
            const _PortalV2 = await ethers.getContractFactory("Portal")

            let portal = deployInfo[network.name].portal
            const portalV2 = await upgrades.upgradeProxy(portal, _PortalV2)
        })

    })
})