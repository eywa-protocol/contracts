const fs = require("fs");
let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
const hre = require("hardhat");
const { upgrades } = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    const _Portal = await ethers.getContractFactory("Portal", {
        libraries: {
            RequestIdLib: networkConfig[network.name].requestIdLib,
        }
    });
    //const portal  = await _Portal.deploy(networkConfig[network.name].bridge, networkConfig[network.name].forwarder);
    const portal = await upgrades.deployProxy(_Portal, [networkConfig[network.name].bridge, networkConfig[network.name].forwarder], 
        { initializer: 'initializeFunc', unsafeAllowLinkedLibraries: true }
        );
    await portal.deployed();
    console.log("Portal address:", portal.address);

    const _Synthesis = await ethers.getContractFactory("Synthesis", {
        libraries: {
            RequestIdLib: networkConfig[network.name].requestIdLib,
        }
    });
    //const synthesis  = await _Synthesis.deploy(networkConfig[network.name].bridge, networkConfig[network.name].forwarder);
    const synthesis = await upgrades.deployProxy(_Synthesis, [networkConfig[network.name].bridge, networkConfig[network.name].forwarder], { initializer: 'initializeFunc', unsafeAllowLinkedLibraries: true });
    await synthesis.deployed();
    console.log("Synthesis address:", synthesis.address);

    //Deploy FrontHelper
    const _FrontHelper = await ethers.getContractFactory("FrontHelper");
    const frontHelper = await _FrontHelper.deploy();
    await frontHelper.deployed();
    networkConfig[network.name].frontHelper = frontHelper.address;
    console.log(`FrontHelper address: ${frontHelper.address}`);

    // deploy Curve Proxy
    const CurveProxy = await ethers.getContractFactory('CurveProxy');
    const curveProxy = await upgrades.deployProxy(CurveProxy, [
        networkConfig[network.name].forwarder,
        networkConfig[network.name].portal,
        networkConfig[network.name].synthesis,
        networkConfig[network.name].bridge
    ], { initializer: 'initialize' });
    await curveProxy.deployed()
    console.log(`CurveProxy address: ${curveProxy.address}`);
    // initial Curve proxy setup
    await synthesis.setCurveProxy(curveProxy.address);



    //Deploy Router
    const _Router = await ethers.getContractFactory("Router");
    const router = await _Router.deploy(portal.address, synthesis.address, curveProxy.address);
    await router.deployed();
    console.log(`Router address: ${router.address}`);

    networkConfig[network.name].portal = portal.address;
    networkConfig[network.name].synthesis = synthesis.address;
    networkConfig[network.name].curveProxy = curveProxy.address
    networkConfig[network.name].router = router.address;

    fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./helper-hardhat-config.json",
        JSON.stringify(networkConfig, undefined, 2));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
