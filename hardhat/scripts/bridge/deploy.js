const fs = require("fs");
let networkConfig = require('/contracts/helper-hardhat-config.json')
const hre = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    const _NodeList = await ethers.getContractFactory("NodeList");
    const nodeList  = await _NodeList.deploy();
    await nodeList.deployed();
    console.log("NodeList address:", nodeList.address);

    const _Bridge = await ethers.getContractFactory("Bridge");
    const bridge  = await _Bridge.deploy(nodeList.address);
    await bridge.deployed();
    console.log("Bridge address:", bridge.address);

    const _MockDexPool = await ethers.getContractFactory("MockDexPool");
    const mockDexPool  = await _MockDexPool.deploy(bridge.address);
    await mockDexPool.deployed();
    console.log(`MockDexPool address: ${mockDexPool.address}`);

    networkConfig[network.name].nodeList   = nodeList.address;
    networkConfig[network.name].bridge     = bridge.address;
    networkConfig[network.name].mockDexPool= mockDexPool.address;

    const newJson = {
        owner: deployer.address,
        nodeList: nodeList.address,
        bridge: bridge.address,
        mockDexPool: mockDexPool.address
    }
    const jsonEnvFileName = "/contracts/networks_env/env_" + network.name + ".json"
    fs.writeFileSync(jsonEnvFileName, JSON.stringify(newJson, undefined, 1));

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
