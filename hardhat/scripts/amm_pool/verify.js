// $ npx hardhat run scripts/amm_pool/verify.js --network rinkeby

let networkConfig = require('../../helper-hardhat-config.json')
const { upgrades } = require("hardhat");
const hre = require("hardhat");

// verify proxy Portal, proxy Synthesis and FrontHelper
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

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

    let proxySyntesisAddress = networkConfig[network.name].synthesis;
    let proxyPortalAddress = networkConfig[network.name].portal;

    const ProxyAdminHelper = await hre.ethers.getContractFactory('ProxyAdminHelper');
    const proxyAdmin = await ProxyAdminHelper.attach(proxyAdminAddress);

    let implementationSyntesis = await proxyAdmin.getProxyImplementation(proxySyntesisAddress);
    let implementationPortal = await proxyAdmin.getProxyImplementation(proxyPortalAddress);

    console.log('syntesis proxy', proxySyntesisAddress);
    console.log('syntesis implementation', implementationSyntesis);
    console.log('portal proxy', proxyPortalAddress);
    console.log('portal implementation', implementationPortal);

    // implementation verify
    try {
        await hre.run("verify:verify", {
            address: implementationPortal,
            constructorArguments: [],
            contract: "contracts/amm_pool/Portal.sol:Portal"
        });
    } catch (e) {
        console.log(e);
    }

    try {
        await hre.run("verify:verify", {
            address: implementationSyntesis,
            constructorArguments: [],
            contract: "contracts/amm_pool/Synthesis.sol:Synthesis"
        });
    } catch (e) {
        console.log(e);
    }

    let data = '0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000443410c15f0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

    // proxy for synthesis
    try {
        await hre.run("verify:verify", {
            address: networkConfig[network.name].synthesis,
            constructorArguments: [implementationSyntesis, proxyAdminAddress, data],
            contract: "contracts/utils/ProxiesVerify.sol:TransparentUpgradeableProxyHelper"
        });
    } catch (e) {
        console.log(e);
    }

    // proxy for portal
    try {
        await hre.run("verify:verify", {
            address: networkConfig[network.name].portal,
            constructorArguments: [implementationPortal, proxyAdminAddress, data],
            contract: "contracts/utils/ProxiesVerify.sol:TransparentUpgradeableProxyHelper"
        });
    } catch (e) {
        console.log(e);
    }

    // front helper verify
    try {
        await hre.run("verify:verify", {
            address: networkConfig[network.name].frontHelper,
            constructorArguments: [],
            contract: "contracts/utils/FrontHelper.sol:FrontHelper"
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