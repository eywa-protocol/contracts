const fs = require("fs");
let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
const hre = require("hardhat");
const { upgrades, ethers } = require("hardhat");
const { addressToBytes32, timeout } = require('../../utils/helper');

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    // let portal = networkConfig[network.name].portal
    // let synthesis = networkConfig[network.name].synthesis
    // let curveProxy = networkConfig[network.name].curveProxy
    // let chainId = networkConfig[network.name].chainId
    // let eywa = networkConfig[network.name].eywa

    // const EYWA = await ethers.getContractFactory("SyntERC20");
    // const eywaToken = await EYWA.attach("0xF0AA41A080109BBAF5cB7Dc3434FB20b2Cf2D014");

    // const Synthesis = await ethers.getContractFactory("Synthesis");
    // const synthesisC = await Synthesis.attach(synthesis);
    // console.log(await synthesisC.getRepresentation(addressToBytes32("0xF35d39587b9364BDaBA3Fe1E3b929B7877b2986d")))

    // console.log(await eywaToken.balanceOf(deployer.address))
    // await eywaToken.mint("0x3353b1b76a969e834403EbDc8C6191fEF7290feA", ethers.utils.parseEther("100000000.0"))

    // const Test = await ethers.getContractFactory("TestTarget");
    // const test = await Test.deploy();

    // //Deploy Router
    // const _Router = await ethers.getContractFactory("Router");
    // const router = await _Router.deploy(portal, synthesis, curveProxy, chainId);
    // await router.deployed();
    // console.log(`Router address: ${router.address} on ${network.name}`);

    //Set trusted Worker
    // const _Router = await ethers.getContractFactory("Router");
    // const router = await _Router.attach(networkConfig[network.name].router)
    // tx1 = await router.setTrustedWorker("0xec92e5D829f7Ef4793620B47c1e3eCB705b95DAB")
    // tx2 = await router.setTrustedWorker("0xA530c0122a16734A2e7e3E4497101eAa17057fe8")
    // console.log(tx1)
    // console.log(tx2)

    // // verify
    // try {
    //     await hre.run("verify:verify", {
    //         address: router.address,
    //         constructorArguments: [
    //             portal,
    //             synthesis,
    //             curveProxy,
    //             chainId
    //         ],
    //         contract: "contracts/amm_pool/Router.sol:Router"
    //     });
    // } catch (e) {
    //     console.log(e);
    // }




    // We get the contract to deploy
    const UniswapV2Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
    const uniswapV2Factory = await UniswapV2Factory.deploy(deployer.address);

    await uniswapV2Factory.deployed();

    console.log("UniswapV2Factory deployed to:", uniswapV2Factory.address);

    const WETH = await hre.ethers.getContractFactory("WETH9");
    const weth = await WETH.deploy();
    await weth.deployed();

    // const weth = await WETH.attach('');

    console.log("WETH deployed to:", weth.address);

    const UniswapV2Router02 = await hre.ethers.getContractFactory("UniswapV2Router02");
    const uniswapV2Router02 = await UniswapV2Router02.deploy(uniswapV2Factory.address, weth.address);

    await uniswapV2Router02.deployed();

    console.log("UniswapV2Router02 deployed to:", uniswapV2Router02.address);

    const eusd = await hre.ethers.getContractFactory("ERC20Mock");
    const EUSD = await eusd.deploy("EUSD","EUSD");
    await EUSD.deployed();
    console.log("EUSD deployed to:", EUSD.address);
    const eywa = await hre.ethers.getContractFactory("ERC20Mock");
    const EYWA = await eywa.deploy("EYWA","EYWA");
    await EYWA.deployed();
    console.log("EYWA deployed to:", EYWA.address);

    await EYWA.

    await EUSD.approve(uniswapV2Router02.address,ethers.constants.MaxUint256,{gasLimit: 1000000, gasPrice: 4000000000})
    await EYWAt.approve(uniswapV2Router02.address,ethers.constants.MaxUint256,{gasLimit: 1000000, gasPrice: 4000000000})

    await uniswapV2Router02.addLiquidity(
        networkConfig["network2"].hubPool.lp,
        networkConfig["network2"].token[0].address,
        ethers.utils.parseEther("1.0"),
        ethers.utils.parseEther("1.0"),
        1,
        1,
        deployer.address,
        ethers.constants.MaxInt256,
        {gasLimit: 1000000, gasPrice: 4000000000}
    )
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
