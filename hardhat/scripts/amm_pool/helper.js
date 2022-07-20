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

    // let localToken = networkConfig[network.name].localToken[0].address
    // const Portal = await ethers.getContractFactory("Portal");
    // const portalC = await Portal.attach(portal);
    // console.log(await portalC.tokenDecimals(addressToBytes32(localToken)))



    const EywaNft = await ethers.getContractFactory("EywaNFT");
    let eywaNft = EywaNft.attach("0x8b4CaA2e10355C20a9DD2E5cF092A81B157EaE6E");
    await eywaNft.setMerkleRoot("0xbd28ea12a549a17d8fed042f251dcafbbcb36e3c117a5fa23c134ba85ed1bff0")


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

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
