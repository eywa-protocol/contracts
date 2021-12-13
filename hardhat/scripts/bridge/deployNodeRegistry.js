const fs = require("fs");
let networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    const _Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await _Forwarder.attach(networkConfig[network.name].forwarder);

    // Deploy EYWA Test token with permit
    const _ERC20Permit = await ethers.getContractFactory("TestTokenPermit");
    const EYWA = await _ERC20Permit.deploy("EYWA", "EYWA");
    await EYWA.deployed();
    networkConfig[network.name].eywa = EYWA.address;
    console.log("EYWA ERC20 address:", EYWA.address);

    // Deploy NodeRegistry
    const _NodeRegistry = await ethers.getContractFactory("NodeRegistry");
    const nodeRegistry = await _NodeRegistry.deploy(EYWA.address, forwarder.address);
    await nodeRegistry.deployed();
    networkConfig[network.name].nodeRegistry = nodeRegistry.address;
    console.log("NodeRegistry address:", nodeRegistry.address);

    // Write deployed contracts addresses to config
    fs.writeFileSync("./helper-hardhat-config.json", JSON.stringify(networkConfig, undefined, 2));

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
