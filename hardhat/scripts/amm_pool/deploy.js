const fs = require("fs");
const jsonEnvFilePath = "/contracts/networks_env/env_" + network.name + ".json"
let newNetworkConfig = require(jsonEnvFilePath)
let networkConfig = require('/contracts/helper-hardhat-config.json')
let jsonEnvFile = JSON.parse(fs.readFileSync(jsonEnvFilePath, 'utf8'))

const hre = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    const _Portal = await ethers.getContractFactory("Portal");
    const portal  = await _Portal.deploy(newNetworkConfig[network.name].bridge, networkConfig[network.name].forwarder);
    await portal.deployed();
    console.log("Portal address:", portal.address);

    const _Synthesis = await ethers.getContractFactory("Synthesis");
    const synthesis  = await _Synthesis.deploy(newNetworkConfig[network.name].bridge, networkConfig[network.name].forwarder);
    await synthesis.deployed();
    console.log("Synthesis address:", synthesis.address);

    jsonEnvFile.portal = portal.address,
    jsonEnvFile.synthesis = synthesis.address,

    fs.writeFileSync(jsonEnvFilePath, JSON.stringify(jsonEnvFile, undefined, 1));

    // fs.writeFileSync("/contracts/helper-hardhat-config.json", JSON.stringify(networkConfig, undefined, 2));

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
