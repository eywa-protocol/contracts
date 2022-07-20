const fs = require("fs");
let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
const hre = require("hardhat");
const { upgrades, ethers } = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    // We get the contract to deploy
    const UniswapV2Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
   // const uniswapV2Factory = await UniswapV2Factory.deploy(deployer.address);
//    await uniswapV2Factory.deployed();
    
    const uniswapV2Factory = await UniswapV2Factory.attach(networkConfig[network.name].uniswapV2Factory)
    //console.log("UniswapV2Factory deployed to:", uniswapV2Factory.address);

    // const WETH = await hre.ethers.getContractFactory("WETH9");
    // const weth = await WETH.deploy();
    // await weth.deployed();

    // const weth = await WETH.attach('');

    //console.log("WETH deployed to:", weth.address);

    const UniswapV2Router02 = await hre.ethers.getContractFactory("UniswapV2Router02");
    // const uniswapV2Router02 = await UniswapV2Router02.deploy(uniswapV2Factory.address, weth.address);

    // await uniswapV2Router02.deployed();

    const uniswapV2Router02 = await UniswapV2Router02.attach(networkConfig[network.name].uniswapV2Router02)

    //console.log("UniswapV2Router02 deployed to:", uniswapV2Router02.address);

    await uniswapV2Factory.createPair(networkConfig[network.name].hubPool.lp, networkConfig[network.name].token[0].address)

    pair = await uniswapV2Factory.allPairs(0)
    console.log(pair)

    // const eusd = await hre.ethers.getContractFactory("ERC20Mock");
    // const EUSD = await eusd.deploy("EUSD","EUSD");
    // await EUSD.deployed();
    // console.log("EUSD deployed to:", EUSD.address);
    // const eywa = await hre.ethers.getContractFactory("ERC20Mock");
    // const EYWA = await eywa.deploy("EYWA","EYWA");
    // await EYWA.deployed();
    // console.log("EYWA deployed to:", EYWA.address);

    // await EUSD.approve(uniswapV2Router02.address,ethers.constants.MaxUint256,{gasLimit: 1000000})
    // await EYWA.approve(uniswapV2Router02.address,ethers.constants.MaxUint256,{gasLimit: 1000000})
    // console.log("EUSD balance: ", ethers.utils.formatEther(await EUSD.balanceOf(deployer.address)))
    // console.log("EYWA balance: ", ethers.utils.formatEther(await EYWA.balanceOf(deployer.address)))
    // console.log(await uniswapV2Router02.addLiquidity(
    //     EUSD.address,
    //     EYWA.address,
    //     ethers.utils.parseEther("1.0"),
    //     ethers.utils.parseEther("1.0"),
    //     1,
    //     1,
    //     deployer.address,
    //     ethers.constants.MaxInt256,
    //     {gasLimit: 30000000}
    // ))
    // await new Promise(resolve => setTimeout(resolve, 15000));
    // console.log("EUSD balance: ", ethers.utils.formatEther(await EUSD.balanceOf(deployer.address)))
    // console.log("EYWA balance: ", ethers.utils.formatEther(await EYWA.balanceOf(deployer.address)))
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
