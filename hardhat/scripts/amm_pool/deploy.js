const fs = require("fs");
let networkConfig = require('/contracts/helper-hardhat-config.json')
const hre = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    const _Portal = await ethers.getContractFactory("Portal");
    const portal  = await _Portal.deploy(networkConfig[network.name].bridge, networkConfig[network.name].forwarder);
    await portal.deployed();
    console.log("Portal address:", portal.address);

    const _Synthesis = await ethers.getContractFactory("Synthesis");
    const synthesis  = await _Synthesis.deploy(networkConfig[network.name].bridge, networkConfig[network.name].forwarder);
    await synthesis.deployed();
    console.log("Synthesis address:", synthesis.address);

    networkConfig[network.name].portal    = portal.address;
    networkConfig[network.name].synthesis = synthesis.address;

    const newJson = {
        portal: portal.address,
        synthesis: synthesis.address
    }
    const jsonEnvFileName = "/contracts/networks_env/env_" + network.name + "_amm.json"
    fs.writeFileSync(jsonEnvFileName, newJson);

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
