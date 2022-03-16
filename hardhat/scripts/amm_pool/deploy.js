const fs = require("fs");
let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
const hre = require("hardhat");
const { upgrades } = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    const _Portal = await ethers.getContractFactory("Portal");
    //const portal  = await _Portal.deploy(networkConfig[network.name].bridge, networkConfig[network.name].forwarder);
    const portal = await upgrades.deployProxy(_Portal, [networkConfig[network.name].bridge, networkConfig[network.name].forwarder], { initializer: 'initializeFunc' });
    await portal.deployed();
    console.log("Portal address:", portal.address);

    const _Synthesis = await ethers.getContractFactory("Synthesis");
    //const synthesis  = await _Synthesis.deploy(networkConfig[network.name].bridge, networkConfig[network.name].forwarder);
    const synthesis = await upgrades.deployProxy(_Synthesis, [networkConfig[network.name].bridge, networkConfig[network.name].forwarder], { initializer: 'initializeFunc' });
    await synthesis.deployed();
    console.log("Synthesis address:", synthesis.address);

    //Deploy FrontHelper
    const _FrontHelper = await ethers.getContractFactory("FrontHelper");
    const frontHelper = await _FrontHelper.deploy();
    await frontHelper.deployed();
    networkConfig[network.name].frontHelper = frontHelper.address;
    console.log(`FrontHelper address: ${frontHelper.address}`);

    networkConfig[network.name].portal    = portal.address;
    networkConfig[network.name].synthesis = synthesis.address;
    fs.writeFileSync("./helper-hardhat-config.json", JSON.stringify(networkConfig, undefined, 2));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
