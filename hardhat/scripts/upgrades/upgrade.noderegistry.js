const { upgrades, ethers, network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');

contract('Contracts upgrade', () => {

    describe("", () => {

        it("NodeRegistry upgrade", async function () {
            const _NodeRegistryV2 = await ethers.getContractFactory("NodeRegistry")

            let nodeRegistry = deployInfo[network.name].nodeRegistry
            const nodeRegistryV2 = await upgrades.upgradeProxy(nodeRegistry, _NodeRegistryV2)
        })

    })
})