const fs = require("fs");
let networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");
const { upgrades } = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    // Deploy EYWA Test token with permit
    const _ERC20Permit = await ethers.getContractFactory("TestTokenPermit");
    const EYWA = await _ERC20Permit.deploy("EYWA", "EYWA");
    await EYWA.deployed();
    networkConfig[network.name].eywa = EYWA.address;
    console.log("EYWA ERC20 address:", EYWA.address);

    // Deploy Forwarder
    const _Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await _Forwarder.deploy();
    await forwarder.deployed();
    networkConfig[network.name].forwarder = forwarder.address;
    console.log("Forwarder address:", forwarder.address);

    // Deploy RelayerPoolFactory library
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

    const nodeRegistry = await _NodeRegistry.deploy(EYWA.address, forwarder.address);
    await nodeRegistry.deployed();
    console.log("NodeRegistry address:", nodeRegistry.address);

    networkConfig[network.name].bridge = nodeRegistry.address;

    // Deploy MockDexPool
    const _MockDexPool = await ethers.getContractFactory("MockDexPool");
    const mockDexPool = await _MockDexPool.deploy(bridge.address);
    await mockDexPool.deployed();
    networkConfig[network.name].mockDexPool = mockDexPool.address;
    console.log(`MockDexPool address: ${mockDexPool.address}`);

    // Write deployed contracts addresses to config
    fs.writeFileSync("./helper-hardhat-config.json", JSON.stringify(networkConfig, undefined, 2));

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
