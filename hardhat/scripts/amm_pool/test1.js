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
    // let eywa = networkConfig[network.name].eywa
    // console.log(
    //     portal,synthesis,curveProxy,chainId
    // )

    // const SyntERC20 = await ethers.getContractFactory('SyntERC20')
    // const Synthesis = await ethers.getContractFactory('Synthesis')
    // console.log(await Synthesis.attach(networkConfig[network.name].synthesis).getRepresentation(addressToBytes32("0x3A97DF6F4c184F991F6872C726E4C739F51E7c97")))

    // const EYWA = await ethers.getContractFactory("EywaToken");
    // let eywaA = await EYWA.deploy(deployer.address, networkConfig[network.name].chainId)
    // console.log(`Router address: ${eywaA.address} on ${network.name}`);

    const EYWA = await ethers.getContractFactory("SyntERC20");
    const eywaToken = await EYWA.attach("0x3A97DF6F4c184F991F6872C726E4C739F51E7c97");
    //     await eywaToken.transfer("0x39FEA483ce65F36394e07a97fF49aE1AA653ee0b", ethers.utils.parseEther("10000000.0"))
    //     await eywaToken.transfer("0xd882B5095DD2ABD0960267655D8744E4B054EcED", ethers.utils.parseEther("10000000.0"))
    //     await eywaToken.transfer("0x3353b1b76a969e834403EbDc8C6191fEF7290feA", ethers.utils.parseEther("10000000.0"))
    //     await eywaToken.transfer("0x1Bbd709E08c9daAC24f027e65B5953CC21ef1283", ethers.utils.parseEther("10000000.0"))
    //     await eywaToken.transfer("0xfF35026a8e0265d29B508a00F311dDaE1F6a3B83", ethers.utils.parseEther("10000000.0"))

    // const Synthesis = await ethers.getContractFactory("Synthesis");
    // const synthesisC = await Synthesis.attach(synthesis);
    // console.log(await synthesisC.getRepresentation(addressToBytes32("0xd882b5095dd2abd0960267655d8744e4b054eced")))

    // console.log(await eywaToken.balanceOf(deployer.address))
    // await eywaToken.mint("0xfF35026a8e0265d29B508a00F311dDaE1F6a3B83", ethers.utils.parseEther("10000000.0"))


    // //Deploy Router
    const _Router = await ethers.getContractFactory("Router");
    const router = await _Router.deploy(portal, synthesis, curveProxy, chainId);//  console.log(router)
    let tx = await router.deployTransaction.wait();
    console.log('hash', tx.transactionHash);
    console.log(`Router address: ${router.address} on ${network.name}`);


    //Set trusted Worker
    // const router = await _Router.attach("0xC40B277508B55E68ab366FF3b2A833b21f668DdB");
    // tx1 = await router.setTrustedWorker("0xA530c0122a16734A2e7e3E4497101eAa17057fe8", {gasPrice: 5_000_000_000, gasLimit: 1_000_000});
    // await tx1.wait();
    // tx2 = await router.setTrustedWorker("0xec92e5D829f7Ef4793620B47c1e3eCB705b95DAB");
    // await tx2.wait();
    // tx3 = await router.setTrustedWorker("0x8e845cd7F08FF4366b7Af17A2e626FE9EcBf3721");
    // await tx3.wait();
    // console.log(await router._trustedWorker("0xA530c0122a16734A2e7e3E4497101eAa17057fe8"));  //testnet
    // console.log(await router._trustedWorker("0xec92e5D829f7Ef4793620B47c1e3eCB705b95DAB"));  //testnet
    // console.log(await router._trustedWorker("0x8e845cd7F08FF4366b7Af17A2e626FE9EcBf3721"));     //mainnet
    // console.log(await router.owner())

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
