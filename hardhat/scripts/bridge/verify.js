// $ npx hardhat run scripts/bridge/verify.js --network rinkeby

// verify Forwarder, proxy Bridge and MockDexPool
let networkConfig = require('../../helper-hardhat-config.json')
const { upgrades } = require("hardhat");
const hre = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    // forwarder verify
    try {
        await hre.run("verify:verify", {
            address: networkConfig[network.name].forwarder,
            constructorArguments: [],
            contract: "contracts/bridge/Forwarder.sol:Forwarder"
        });
    } catch (e) {
        console.log(e);
    }

    let proxyAdminAddress = (await upgrades.admin.getInstance()).address;
    console.log('ProxyAdmin', proxyAdminAddress);

    // verify proxy admin from upgrades
    try {
        await hre.run("verify:verify", {
            address: proxyAdminAddress,
            constructorArguments: [],
            contract: "contracts/utils/ProxiesVerify.sol:ProxyAdminHelper"
        });
    } catch (e) {
        console.log(e);
    }

    let proxyBridgeAddress = networkConfig[network.name].bridge;

    const ProxyAdminHelper = await hre.ethers.getContractFactory('ProxyAdminHelper');
    const proxyAdmin = await ProxyAdminHelper.attach(proxyAdminAddress);

    let implementationBridge = await proxyAdmin.getProxyImplementation(proxyBridgeAddress);

    console.log('bridge proxy', proxyBridgeAddress);
    console.log('bridge implementation', implementationBridge);

    // implementation verify
    try {
        await hre.run("verify:verify", {
            address: implementationBridge,
            constructorArguments: [],
            contract: "contracts/bridge/Bridge.sol:Bridge"
        });
    } catch (e) {
        console.log(e);
    }

    let data = '0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000443410c15f0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

    // proxy for bridge
    try {
        await hre.run("verify:verify", {
            address: networkConfig[network.name].bridge,
            constructorArguments: [implementationBridge, proxyAdminAddress, data],
            contract: "contracts/utils/ProxiesVerify.sol:TransparentUpgradeableProxyHelper"
        });
    } catch (e) {
        console.log(e);
    }

    // MockDexPool verify
    try {
        await hre.run("verify:verify", {
            address: networkConfig[network.name].mockDexPool,
            constructorArguments: [proxyBridgeAddress],
            contract: "contracts/bridge/mocks/MockDexPool.sol:MockDexPool"
        });
    } catch (e) {
        console.log(e);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });