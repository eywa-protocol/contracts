const { expect } = require("chai");
const { upgrades, ethers } = require("hardhat");

contract('Contracts upgrade', () => {

    describe("", () => {
        it("Portal upgrade", async function () {
            const _Portal = await ethers.getContractFactory("Portal")
            const _PortalV2 = await ethers.getContractFactory("PortalV2")

            const portal = await upgrades.deployProxy(_Portal, [web3.utils.randomHex(20), web3.utils.randomHex(20)],
                { initializer: 'initializeFunc' }
            );
            await portal.deployed();
            console.log("Portal address:", portal.address);

            const portalV2 = await upgrades.upgradeProxy(portal.address, _PortalV2)
            const testValue2 = await portalV2.testFunc();
            const testValue = await portalV2.testValue();
            console.log(testValue.toString())
            expect(testValue > 0);
        })

        it("Synthesis upgrade", async function () {
            const _Synthesis = await ethers.getContractFactory("Synthesis")
            const _SynthesisV2 = await ethers.getContractFactory("SynthesisV2")

            const synthesis = await upgrades.deployProxy(_Synthesis, [web3.utils.randomHex(20), web3.utils.randomHex(20)],
                { initializer: 'initializeFunc' }
            );
            await synthesis.deployed();
            console.log("Synthesis address:", synthesis.address);

            const synthesisV2 = await upgrades.upgradeProxy(synthesis.address, _SynthesisV2)
            const testValue2 = await synthesisV2.testFunc();
            const testValue = await synthesisV2.testValue();
            console.log(testValue.toString())
            expect(testValue > 0);
        })

        it("Bridge upgrade", async function () {
            const _Bridge = await ethers.getContractFactory("Bridge")
            const _BridgeV2 = await ethers.getContractFactory("BridgeV2")

            const bridge = await upgrades.deployProxy(_Bridge, [web3.utils.randomHex(20)],
                { initializer: 'initialize' }
            );
            await bridge.deployed();
            console.log("Bridge address:", bridge.address);

            const bridgeV2 = await upgrades.upgradeProxy(bridge.address, _BridgeV2)
            const testValue2 = await bridgeV2.testFunc();
            const testValue = await bridgeV2.testValue();
            console.log(testValue.toString())
            expect(testValue > 0);
        })

        it("NodeRegistry upgrade", async function () {
            const _NodeRegistry = await ethers.getContractFactory("NodeRegistry")
            const _NodeRegistryV2 = await ethers.getContractFactory("NodeRegistryV2")
            const _RelayerPoolFactory = await ethers.getContractFactory("RelayerPoolFactory")
            const poolFactory = await _RelayerPoolFactory.deploy();
            console.log(poolFactory.address)
            const nodeRegistry = await upgrades.deployProxy(_NodeRegistry, [web3.utils.randomHex(20), web3.utils.randomHex(20), poolFactory.address],
                { initializer: 'initialize2' }
            );
            await nodeRegistry.deployed();
            console.log("Bridge address:", nodeRegistry.address);

            const nodeRegistryV2 = await upgrades.upgradeProxy(nodeRegistry.address, _NodeRegistryV2)
            const testValue2 = await nodeRegistryV2.testFunc();
            const testValue = await nodeRegistryV2.testValue();
            console.log(testValue.toString())
            expect(testValue > 0);
        })
    })
})