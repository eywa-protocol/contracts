const fs = require("fs");
let networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    //Test token with permit
    const _ERC20Permit = await ethers.getContractFactory("TestERC20Permit");
    const EYWA  = await _ERC20Permit.deploy("EYWA", "EYWA");
    await EYWA.deployed();
    console.log("EYWA ERC20 address:", EYWA.address);

    const _NodeRegistry = await ethers.getContractFactory("NodeRegistry");
    //TODO: add Consensus, Forwarder (testAddress for now)
    const testAddress = "0x2e988A386a799F506693793c6A5AF6B54dfAaBfB"
    const nodeRegistry  = await _NodeRegistry.deploy(EYWA.address, testAddress /*consensus*/ ,testAddress /*forwarder*/);
    await nodeRegistry.deployed();
    console.log("NodeRegistry address:", nodeRegistry.address);

    const _Bridge = await ethers.getContractFactory("Bridge");
    const bridge  = await _Bridge.deploy(nodeRegistry.address);
    await bridge.deployed();
    console.log("Bridge address:", bridge.address);

    const _MockDexPool = await ethers.getContractFactory("MockDexPool");
    const mockDexPool  = await _MockDexPool.deploy(bridge.address);
    await mockDexPool.deployed();
    console.log(`MockDexPool address: ${mockDexPool.address}`);

    this.tx = await bridge.updateDexBind(mockDexPool.address, true);
    console.log("mockDexPool updateDexBind:", tx);

    networkConfig[network.name].nodeRegistry   = nodeRegistry.address;
    networkConfig[network.name].bridge     = bridge.address;
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
