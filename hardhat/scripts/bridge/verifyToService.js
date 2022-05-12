// npx hardhat run scripts/bridge/verifyToService.js --network bscTestnet

// verify EYWA Test token, forwarder, proxy NodeRegistry and MockDexPool
let networkConfig = require('../../helper-hardhat-config.json')
const { upgrades } = require("hardhat");
const hre = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    if (network.name.includes("network") || network.name === 'harmonylocal' || network.name === 'harmonytestnet') {
        // EYWA Test token with permit verify
        try {
            await hre.run("verify:verify", {
                address: networkConfig[network.name].eywa,
                constructorArguments: ["EYWA-TOKEN", "EYWA"],
                contract: "contracts/bridge/test/TestERC20Permit.sol:TestTokenPermit"
            });
        } catch (e) {
            console.log(e);
        }

        // EYWA-POA Test token with permit verify
        try {
            await hre.run("verify:verify", {
                address: networkConfig[network.name].tokenPoa,
                constructorArguments: ["EYWA-POA", "POAT"],
                contract: "contracts/bridge/test/TestERC20Permit.sol:TestTokenPermit"
            });
        } catch (e) {
            console.log(e);
        }
    } else {
        // EYWA Test token with permit verify
        try {
            await hre.run("verify:verify", {
                address: networkConfig[network.name].eywa,
                constructorArguments: [deployer.address, networkConfig[network.name].chainId],
                contract: "contracts/dao/EywaToken.sol:EywaToken"
            });
        } catch (e) {
            console.log(e);
        }

        // EYWA-POA Test token with permit verify
        try {
            await hre.run("verify:verify", {
                address: networkConfig[network.name].tokenPoa,
                constructorArguments: ["EYWA-POA", "POAT", networkConfig[network.name].chainId],
                contract: "contracts/amm_pool/TokenPOA.sol:TokenPOA"
            });
        } catch (e) {
            console.log(e);
        }
    }
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

    // RelayerPoolFactory
    try {
        await hre.run("verify:verify", {
            address: networkConfig[network.name].relayerPoolFactory,
            constructorArguments: [],
            contract: "contracts/bridge/RelayerPoolFactory.sol:RelayerPoolFactory"
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

    let proxyNodeRegistryAddress = networkConfig[network.name].nodeRegistry;

    const ProxyAdminHelper = await hre.ethers.getContractFactory('ProxyAdminHelper');
    const proxyAdmin = await ProxyAdminHelper.attach(proxyAdminAddress);

    let implementationNodeRegistry = await proxyAdmin.getProxyImplementation(proxyNodeRegistryAddress);

    console.log('NodeRegistry proxy', proxyNodeRegistryAddress);
    console.log('NodeRegistry implementation', implementationNodeRegistry);

    // implementation verify
    try {
        await hre.run("verify:verify", {
            address: implementationNodeRegistry,
            constructorArguments: [],
            contract: "contracts/bridge/NodeRegistry.sol:NodeRegistry"
        });
    } catch (e) {
        console.log(e);
    }

    let data = '0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000449434b989000000000000000000000000d557158282f401079000fb53d87fb3024330468d0000000000000000000000001d4c7d1b03ac81047f077ee8fdcbd14e45fd22cf00000000000000000000000000000000000000000000000000000000';

    // proxy for NodeRegistry
    try {
        await hre.run("verify:verify", {
            address: networkConfig[network.name].nodeRegistry,
            constructorArguments: [implementationNodeRegistry, proxyAdminAddress, data],
            contract: "contracts/utils/ProxiesVerify.sol:TransparentUpgradeableProxyHelper"
        });
    } catch (e) {
        console.log(e);
    }

    // MockDexPool verify
    try {
        await hre.run("verify:verify", {
            address: networkConfig[network.name].mockDexPool,
            constructorArguments: [proxyNodeRegistryAddress],
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