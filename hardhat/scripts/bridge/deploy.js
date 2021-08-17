const fs = require("fs");
let networkConfig = require('../../helper-hardhat-config.json')
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

    const _MyCoin = await ethers.getContractFactory("MyCoin");
    const myCoin  = await _MyCoin.deploy();
    await myCoin.deployed();
    console.log("MyCoin address:", myCoin.address);

    const _MyRewards = await ethers.getContractFactory("MyRewards");
    const myRewards  = await _MyRewards.deploy(myCoin.address);
    await myRewards.deployed();
    console.log("MyRewards address:", myRewards.address);

    const _MockDexPool = await ethers.getContractFactory("MockDexPool");
    const mockDexPool  = await _MockDexPool.deploy(bridge.address);
    await mockDexPool.deployed();
    console.log(`MockDexPool address: ${mockDexPool.address}`);

    this.tx = await bridge.updateDexBind(mockDexPool.address, true);
    console.log("mockDexPool updateDexBind:", tx);

    networkConfig[network.name].nodeList   = nodeList.address;
    networkConfig[network.name].bridge     = bridge.address;
    networkConfig[network.name].myCoin     = myCoin.address;
    networkConfig[network.name].myRewards  = myRewards.address;
    networkConfig[network.name].mockDexPool= mockDexPool.address;
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
