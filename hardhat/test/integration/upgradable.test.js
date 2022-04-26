let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
const { expect } = require("chai");
const { upgrades,ethers } = require("hardhat");

contract('Contracts upgrade', () => {

    describe("", () => {
        it("Portal upgrade", async function () {
            const _Portal = await ethers.getContractFactory("Portal")
            const _PortalV2 = await ethers.getContractFactory("PortalV2")

            const portal = await upgrades.deployProxy(_Portal, [deployInfo["network1"].bridge, deployInfo["network1"].forwarder], 
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

            const synthesis = await upgrades.deployProxy(_Synthesis, [deployInfo["network1"].bridge, deployInfo["network1"].forwarder], 
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

            const bridge = await upgrades.deployProxy(_Bridge, [deployInfo["network1"].forwarder], 
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
            const _RelayerPoolFactory = await ethers.getContractFactory("RelayerPoolFactory");
            const relayerPoolFactory = await _RelayerPoolFactory.deploy();
            await relayerPoolFactory.deployed();
            console.log("RelayerPoolFactory address:", relayerPoolFactory.address);

            // Deploy NodeRegistry (contains Bridge)
            const _NodeRegistry = await ethers.getContractFactory("NodeRegistry", {
                libraries: {
                    RelayerPoolFactory: relayerPoolFactory.address,
                },
            });

            const _NodeRegistryV2 = await ethers.getContractFactory("NodeRegistryV2", {
                libraries: {
                    RelayerPoolFactory: relayerPoolFactory.address,
                },
            });

            // const bridge = await _NodeRegistry.deploy({gasLimit: 5_000_000});
            const bridge = await upgrades.deployProxy(
                _NodeRegistry,
                [deployInfo["network1"].localToken[0].address, deployInfo["network1"].forwarder],
                { initializer: 'initialize2', unsafeAllow: ['external-library-linking'] },
            );
            await bridge.deployed();

            const nodeRegistryV2 = await upgrades.upgradeProxy(bridge.address, _NodeRegistryV2, {unsafeAllow: ['external-library-linking']})
            const testValue2 = await nodeRegistryV2.testFunc();
            const testValue = await nodeRegistryV2.testValue();
            console.log(testValue.toString())
            expect(testValue > 0);
        })
    })
})