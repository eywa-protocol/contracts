// npx hardhat run scripts/bridge/deployToService.js --network rinkeby
const fs = require("fs");
let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
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
    networkConfig[network.name].relayerPoolFactory = relayerPoolFactory.address;
    console.log("RelayerPoolFactory address:", relayerPoolFactory.address);

    // Deploy RequestIdLib library
    const _RequestIdLib = await ethers.getContractFactory("RequestIdLib");
    const requestIdLib = await _RequestIdLib.deploy();
    await requestIdLib.deployed();
    networkConfig[network.name].requestIdLib = requestIdLib.address;
    console.log("RequestIdLib address:", requestIdLib.address);

    // Deploy NodeRegistry (contains Bridge)
    const _NodeRegistry = await ethers.getContractFactory("NodeRegistry", {
        libraries: {
            RelayerPoolFactory: relayerPoolFactory.address,
        },
    });

    // const bridge = await _NodeRegistry.deploy({gasLimit: 5_000_000});
    const bridge = await upgrades.deployProxy(
        _NodeRegistry,
        [EYWA.address, forwarder.address],
        { initializer: 'initialize2', unsafeAllow: ['external-library-linking'] },
    );
    await bridge.deployed();
    networkConfig[network.name].nodeRegistry = bridge.address;
    networkConfig[network.name].bridge = bridge.address;
    console.log("NodeRegistry address:", bridge.address);

    // Deploy MockDexPool
    const _MockDexPool = await ethers.getContractFactory("MockDexPool");
    const mockDexPool = await _MockDexPool.deploy(bridge.address);
    await mockDexPool.deployed();
    networkConfig[network.name].mockDexPool = mockDexPool.address;
    console.log(`MockDexPool address: ${mockDexPool.address}`);

    // Write deployed contracts addresses to config
    fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./helper-hardhat-config.json",
        JSON.stringify(networkConfig, undefined, 2));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
