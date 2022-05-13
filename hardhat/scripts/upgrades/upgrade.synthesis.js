const { upgrades, ethers, network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');

contract('Contracts upgrade', () => {

    describe("", () => {

        it("Synthesis upgrade", async function () {
            const _SynthesisV2 = await ethers.getContractFactory("Synthesis")

            let synthesis = deployInfo[network.name].synthesis
            const synthesisV2 = await upgrades.upgradeProxy(synthesis, _SynthesisV2)
        })

    })
})