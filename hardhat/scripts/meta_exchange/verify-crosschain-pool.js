// npx hardhat run scripts/meta_exchange/verify-crosschain-pool.js --network rinkeby

// verify CurveProxy
let networkConfig = require('../../helper-hardhat-config.json')
const { upgrades, network} = require("hardhat");
const hre = require("hardhat");
const deployInfo = require("../../helper-hardhat-config.json");

const poolSize = 3

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

    let proxyCurveProxyAddress = networkConfig[network.name].curveProxy;

    const ProxyAdminHelper = await hre.ethers.getContractFactory('ProxyAdminHelper');
    const proxyAdmin = await ProxyAdminHelper.attach(proxyAdminAddress);

    let implementationCurveProxy = await proxyAdmin.getProxyImplementation(proxyCurveProxyAddress);

    console.log('CurveProxy proxy', proxyCurveProxyAddress);
    console.log('CurveProxy implementation', implementationCurveProxy);

    // implementation verify
    try {
        await hre.run("verify:verify", {
            address: implementationCurveProxy,
            constructorArguments: [],
            contract: "contracts/amm_pool/CurveProxy.sol:CurveProxy"
        });
    } catch (e) {
        console.log(e);
    }

    let data = '0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000449434b989000000000000000000000000d557158282f401079000fb53d87fb3024330468d0000000000000000000000001d4c7d1b03ac81047f077ee8fdcbd14e45fd22cf00000000000000000000000000000000000000000000000000000000';

    // proxy for CurveProxy
    try {
        await hre.run("verify:verify", {
            address: networkConfig[network.name].curveProxy,
            constructorArguments: [implementationCurveProxy, proxyAdminAddress, data],
            contract: "contracts/utils/ProxiesVerify.sol:TransparentUpgradeableProxyHelper"
        });
    } catch (e) {
        console.log(e);
    }

    for (let i = 0; i < poolSize; i++) {
        // token verify
        try {
            await hre.run("verify:verify", {
                address: networkConfig[network.name].localToken[i],
                constructorArguments: [network.name + "TokenStable" + i, "TKS" + i],
                contract: "contracts/amm_pool/SyntERC20.sol:SyntERC20"
            });
        } catch (e) {
            console.log(e);
        }
    }

    // @todo verify curve tokens and pulls

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });