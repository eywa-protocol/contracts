const fs = require("fs");
let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
const hre = require("hardhat");
const { upgrades, ethers } = require("hardhat");
const { addressToBytes32, timeout } = require('../../utils/helper');

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    let portal = networkConfig[network.name].portal
    let synthesis = networkConfig[network.name].synthesis
    let curveProxy = networkConfig[network.name].curveProxy
    let chainId = networkConfig[network.name].chainId
    let eywa = networkConfig[network.name].eywa

    const EYWA = await ethers.getContractFactory("SyntERC20");
    const eywaToken = await EYWA.attach("0xbcDEA80c20C906131126cEbe0d5eFdEf7604eC13");

    // const Synthesis = await ethers.getContractFactory("Synthesis");
    // const synthesisC = await Synthesis.attach(synthesis);
    // console.log(await synthesisC.getRepresentation(addressToBytes32("0xd882b5095dd2abd0960267655d8744e4b054eced")))

    // console.log(await eywaToken.balanceOf(deployer.address))
    await eywaToken.mint("0xd882B5095DD2ABD0960267655D8744E4B054EcED", ethers.utils.parseEther("100000000.0"))

    // //Deploy Router
    // const _Router = await ethers.getContractFactory("Router");
    // const router = await _Router.deploy(portal, synthesis, curveProxy, chainId);
    // await router.deployed();
    // console.log(`Router address: ${router.address} on ${network.name}`);

    //Set trusted Worker
    // const router = await _Router.attach(networkConfig[network.name].router)
    // tx = await router.setTrustedWorker("0xec92e5D829f7Ef4793620B47c1e3eCB705b95DAB")
    // console.log(tx)

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

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
