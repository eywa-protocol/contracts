// npx hardhat run scripts/bridge/deploy.js --network rinkeby

const fs = require("fs");
let networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");
const { upgrades } = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    // Deploy Forwarder
    const _Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await _Forwarder.deploy();
    await forwarder.deployed();

    networkConfig[network.name].forwarder = forwarder.address;
    console.log("Forwarder address:", forwarder.address);

    // Deploy Bridge
    const _Bridge = await ethers.getContractFactory("Bridge");
    //const bridge = await _Bridge.deploy(forwarder.address);
    const bridge = await upgrades.deployProxy(_Bridge, [forwarder.address], { initializer: 'initialize' });

    await bridge.deployed();

    networkConfig[network.name].bridge = bridge.address;
    console.log("Bridge address:", bridge.address);

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
