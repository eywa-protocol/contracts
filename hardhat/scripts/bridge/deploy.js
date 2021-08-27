const fs = require("fs");
let networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    // Deploy EYWA
    //Test token with permit
    const _ERC20Permit = await ethers.getContractFactory("TestTokenPermit");
    const EYWA = await _ERC20Permit.deploy("EYWA", "EYWA");
    await EYWA.deployed();
    networkConfig[network.name].eywa = EYWA.address;
    console.log("EYWA ERC20 address:", EYWA.address);

    // Deploy NodeRegistry
    const _NodeRegistry = await ethers.getContractFactory("NodeRegistry");
    //TODO: add Consensus, Forwarder (testAddress for now)
    const testAddress = "0x2e988A386a799F506693793c6A5AF6B54dfAaBfB"
    const nodeRegistry = await _NodeRegistry.deploy(EYWA.address, testAddress /*consensus*/, testAddress /*forwarder*/);
    await nodeRegistry.deployed();
    networkConfig[network.name].nodeRegistry = nodeRegistry.address;
    console.log("NodeRegistry address:", nodeRegistry.address);

    //Deploy Bridge
    const _Bridge = await ethers.getContractFactory("Bridge");
    const bridge = await _Bridge.deploy(nodeRegistry.address);
    await bridge.deployed();
    networkConfig[network.name].bridge = bridge.address;
    console.log("Bridge address:", bridge.address);

    //Deploy MockDexPool
    const _MockDexPool = await ethers.getContractFactory("MockDexPool");
    const mockDexPool = await _MockDexPool.deploy(bridge.address);
    await mockDexPool.deployed();
    networkConfig[network.name].mockDexPool = mockDexPool.address;
    console.log(`MockDexPool address: ${mockDexPool.address}`);

    //Deploy Forwarder
    const _Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await _Forwarder.deploy();
    await forwarder.deployed();
    networkConfig[network.name].forwarder = forwarder.address;
    console.log("Forwarder address:", forwarder.address);

    //Write deployed contracts addresses to config
    fs.writeFileSync("./helper-hardhat-config.json", JSON.stringify(networkConfig, undefined, 2));

    // await hre.run("verify:verify", {
    //     address: paymaster.address,
    //     constructorArguments: [
    //     ],
    // })

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
