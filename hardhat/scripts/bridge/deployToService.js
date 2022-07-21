const fs = require("fs");
let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
const hre = require("hardhat");
const { upgrades } = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    // Deploy EYWA Test token with permit
    let _ERC20Permit = null;
    let _TokenPOA = null;
    let EYWA = null;
    let tokenPoa = null;
    if (network.name.includes("network") || network.name === 'harmonylocal' || network.name === 'harmonytestnet') {
        _TokenPOA = await ethers.getContractFactory("TestTokenPermitHarmony");
        tokenPoa = await _TokenPOA.deploy("EYWA-POA", "POAT", networkConfig[network.name].chainId);
        await tokenPoa.deployed();
        await tokenPoa.deployTransaction.wait();
        _ERC20Permit = await ethers.getContractFactory("TestTokenPermitHarmony");
        EYWA = await _ERC20Permit.deploy("EYWA-TOKEN", "EYWA", networkConfig[network.name].chainId);
    } else {
        _TokenPOA = await ethers.getContractFactory("TokenPOA");
        tokenPoa = await _TokenPOA.deploy("EYWA-POA", "POAT", networkConfig[network.name].chainId);
        await tokenPoa.deployed();
        await tokenPoa.deployTransaction.wait();
        _ERC20Permit = await ethers.getContractFactory("EywaToken");
        EYWA = await _ERC20Permit.deploy(deployer.address, networkConfig[network.name].chainId);
    }

    await EYWA.deployed();
    await EYWA.deployTransaction.wait();
    networkConfig[network.name].eywa = EYWA.address;
    networkConfig[network.name].tokenPoa = tokenPoa.address;
    networkConfig[network.name].token[networkConfig[network.name].token.findIndex(x => x.name === 'EYWA-POA')]
    ? networkConfig[network.name].token[networkConfig[network.name].token.findIndex(x => x.name === 'EYWA-POA')] = {address: tokenPoa.address, name:"EYWA-POA", symbol: "POAT"}
    : networkConfig[network.name].token.push({address: tokenPoa.address, name:"EYWA-POA", symbol: "POAT"});
    console.log("EYWA ERC20 address:", EYWA.address);
    console.log("POA ERC20 address:", tokenPoa.address);

    // Deploy Forwarder
    const _Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await _Forwarder.deploy();
    await forwarder.deployed();
    await forwarder.deployTransaction.wait();
    networkConfig[network.name].forwarder = forwarder.address;
    console.log("Forwarder address:", forwarder.address);

    // Deploy RelayerPoolFactory library
    const _RelayerPoolFactory = await ethers.getContractFactory("RelayerPoolFactory");
    const relayerPoolFactory = await _RelayerPoolFactory.deploy();
    await relayerPoolFactory.deployed();
    await relayerPoolFactory.deployTransaction.wait();
    networkConfig[network.name].relayerPoolFactory = relayerPoolFactory.address;
    console.log("RelayerPoolFactory address:", relayerPoolFactory.address);

    // Deploy NodeRegistry (contains Bridge)
    const _NodeRegistry = await ethers.getContractFactory("NodeRegistry");

    // const bridge = await _NodeRegistry.deploy({gasLimit: 5_000_000});
    const bridge = await upgrades.deployProxy(
        _NodeRegistry,
        [tokenPoa.address, forwarder.address, relayerPoolFactory.address],
        { initializer: 'initialize2' },
    );
    await bridge.deployed();
    await bridge.deployTransaction.wait();
    await relayerPoolFactory.setNodeRegistry(bridge.address);
    networkConfig[network.name].nodeRegistry = bridge.address;
    networkConfig[network.name].bridge = bridge.address;
    console.log("NodeRegistry address:", bridge.address);

    // Deploy MockDexPool
    const _MockDexPool = await ethers.getContractFactory("MockDexPool");
    const mockDexPool = await _MockDexPool.deploy(bridge.address);
    await mockDexPool.deployed();
    await mockDexPool.deployTransaction.wait();
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
