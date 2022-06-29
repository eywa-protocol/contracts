const fs = require("fs");
let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
const hre = require("hardhat");
const { upgrades } = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);
    const UniswapV2Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
    const uniswapV2Factory = await UniswapV2Factory.deploy(deployer.address);
    

    await uniswapV2Factory.deployed();
    networkConfig[network.name].uniswapV2Factory = uniswapV2Factory.address
    console.log("UniswapV2Factory deployed to:", uniswapV2Factory.address);

    const WETH = await hre.ethers.getContractFactory("WETH9");
    const weth = await WETH.deploy();
    await weth.deployed();
    networkConfig[network.name].weth = weth.address
    // const weth = await WETH.attach('');

    console.log("WETH deployed to:", weth.address);

    const UniswapV2Router02 = await hre.ethers.getContractFactory("UniswapV2Router02");
    const uniswapV2Router02 = await UniswapV2Router02.deploy(uniswapV2Factory.address, weth.address);

    await uniswapV2Router02.deployed();
    networkConfig[network.name].uniswapV2Router02 = uniswapV2Router02.address
    console.log("UniswapV2Router02 deployed to:", uniswapV2Router02.address);


    const _Portal = await ethers.getContractFactory("Portal")
    //const portal  = await _Portal.deploy(networkConfig[network.name].bridge, networkConfig[network.name].forwarder);
    const portal = await upgrades.deployProxy(_Portal, [networkConfig[network.name].bridge, networkConfig[network.name].forwarder, networkConfig[network.name].chainId],
        { initializer: 'initializeFunc' }
    );
    await portal.deployed();
    console.log("Portal address:", portal.address);

    const _Synthesis = await ethers.getContractFactory("Synthesis");
    //const synthesis  = await _Synthesis.deploy(networkConfig[network.name].bridge, networkConfig[network.name].forwarder);
    const synthesis = await upgrades.deployProxy(_Synthesis, [networkConfig[network.name].bridge, networkConfig[network.name].forwarder, networkConfig[network.name].chainId], { initializer: 'initializeFunc' });
    await synthesis.deployed();
    console.log("Synthesis address:", synthesis.address);

    //Deploy FrontHelper
    const _FrontHelper = await ethers.getContractFactory("FrontHelper");
    const frontHelper = await _FrontHelper.deploy();
    await frontHelper.deployed();
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
        uniswapV2Router02.address,
    ], { initializer: 'initialize'});
    await curveProxy.deployed();
    console.log(`CurveProxy address: ${curveProxy.address}`);
    // initial Curve proxy setup
    const setCurve = await synthesis.setCurveProxy(curveProxy.address);
    await setCurve.wait();



    //Deploy Router
    const _Router = await ethers.getContractFactory("Router");
    const router = await _Router.deploy(portal.address, synthesis.address, curveProxy.address, networkConfig[network.name].chainId);
    await router.deployed();
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
