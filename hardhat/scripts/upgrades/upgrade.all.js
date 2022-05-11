const { upgrades, ethers, network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');

contract('Contracts upgrade', () => {

    describe("", () => {

        it("Portal upgrade", async function () {
            const _PortalV2 = await ethers.getContractFactory("Portal")

            let portal = deployInfo[network.name].portal
            const portalV2 = await upgrades.upgradeProxy(portal, _PortalV2)
        })

        it("Synthesis upgrade", async function () {
            const _SynthesisV2 = await ethers.getContractFactory("Synthesis")

            let synthesis = deployInfo[network.name].synthesis
            const synthesisV2 = await upgrades.upgradeProxy(synthesis, _SynthesisV2)
        })

        it("Bridge upgrade", async function () {
            const _BridgeV2 = await ethers.getContractFactory("Bridge")

            let bridge = deployInfo[network.name].bridge
            const bridgeV2 = await upgrades.upgradeProxy(bridge, _BridgeV2)
        })

        it("NodeRegistry upgrade", async function () {
            const _NodeRegistryV2 = await ethers.getContractFactory("NodeRegistry")

            let nodeRegistry = deployInfo[network.name].nodeRegistry
            const nodeRegistryV2 = await upgrades.upgradeProxy(nodeRegistry, _NodeRegistryV2)
        })

        it("CurveProxy upgrade", async function () {
            const _CurveProxyV2 = await ethers.getContractFactory("NodeRegistry")

            let curveProxy = deployInfo[network.name].nodeRegistry
            const nodeRegistryV2 = await upgrades.upgradeProxy(curveProxy, _CurveProxyV2)
        })

    })
})