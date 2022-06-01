const { upgrades, ethers, network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');

contract('Contracts upgrade', () => {

    describe("", () => {

        it("CurveProxy upgrade", async function () {
            const _CurveProxyV2 = await ethers.getContractFactory("CurveProxy")

            let curveProxy = deployInfo[network.name].curveProxy
            const curveProxyV2 = await upgrades.upgradeProxy(curveProxy, _CurveProxyV2)
        })

    })
})