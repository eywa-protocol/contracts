const fs = require("fs");
let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
const hre = require("hardhat");
const { upgrades } = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    const _Portal = await ethers.getContractFactory("Portal")
    //const portal  = await _Portal.deploy(networkConfig[network.name].bridge, networkConfig[network.name].forwarder);
    const portal = await upgrades.deployProxy(_Portal, [networkConfig[network.name].bridge, networkConfig[network.name].forwarder, networkConfig[network.name].chainId],
        { initializer: 'initializeFunc' }
    );
    await portal.deployed();
    await portal.deployTransaction.wait();
    console.log("Portal address:", portal.address);

    const _Synthesis = await ethers.getContractFactory("Synthesis");
    //const synthesis  = await _Synthesis.deploy(networkConfig[network.name].bridge, networkConfig[network.name].forwarder);
    const synthesis = await upgrades.deployProxy(_Synthesis, [networkConfig[network.name].bridge, networkConfig[network.name].forwarder, networkConfig[network.name].chainId], { initializer: 'initializeFunc' });
    await synthesis.deployed();
    await synthesis.deployTransaction.wait();
    console.log("Synthesis address:", synthesis.address);

    //Deploy FrontHelper
    const _FrontHelper = await ethers.getContractFactory("FrontHelper");
    const frontHelper = await _FrontHelper.deploy();
    await frontHelper.deployed();
    await frontHelper.deployTransaction.wait();
    networkConfig[network.name].frontHelper = frontHelper.address;
    console.log(`FrontHelper address: ${frontHelper.address}`);

    networkConfig[network.name].portal = portal.address;
    networkConfig[network.name].synthesis = synthesis.address;
    
    // deploy Curve Proxy
    const CurveProxy = await ethers.getContractFactory('CurveProxy');
    const curveProxy = await upgrades.deployProxy(CurveProxy, [
        networkConfig[network.name].forwarder,
        networkConfig[network.name].portal,
        networkConfig[network.name].synthesis,
        networkConfig[network.name].bridge,
    ], { initializer: 'initialize' });
    await curveProxy.deployed();
    await curveProxy.deployTransaction.wait();
    console.log(`CurveProxy address: ${curveProxy.address}`);
    // initial Curve proxy setup
    const setCurve = await synthesis.setCurveProxy(curveProxy.address);
    await setCurve.wait();



    //Deploy Router
    const _Router = await ethers.getContractFactory("Router");
    const router = await _Router.deploy(portal.address, synthesis.address, curveProxy.address, networkConfig[network.name].chainId);
    await router.deployed();
    await router.deployTransaction.wait();
    console.log(`Router address: ${router.address}`);

    
    networkConfig[network.name].curveProxy = curveProxy.address;
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
