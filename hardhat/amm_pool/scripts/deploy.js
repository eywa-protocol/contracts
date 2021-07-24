const fs = require("fs");
let networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");

async function main() {

   if(networkConfig[network.name].portal === void 0 || networkConfig[network.name].portal === "" || networkConfig[network.name].synthesis === void 0 || networkConfig[network.name].synthesis === ''){

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
    fs.writeFileSync("../helper-hardhat-config.json", JSON.stringify(networkConfig, undefined, 2));

    // await hre.run("verify:verify", {
    //     address: paymaster.address,
    //     constructorArguments: [
    //     ],
    // })
   }

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
