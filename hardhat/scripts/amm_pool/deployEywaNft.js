const fs = require("fs");
let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
const hre = require("hardhat");
const { upgrades } = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    const allocation = "100000"
    const totalScore = "10000000"

    const EywaNFT = await ethers.getContractFactory("EywaNFT")
    const eywaNft = await EywaNFT.deploy("EYWA-NFT", "EYWA-NFT", allocation, totalScore);
    await eywaNft.setMerkleRoot("0xbd28ea12a549a17d8fed042f251dcafbbcb36e3c117a5fa23c134ba85ed1bff0")
    
    networkConfig[network.name].eywaNft = eywaNft.address;
    console.log("NFT address:", eywaNft.address)

    fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./helper-hardhat-config.json",
        JSON.stringify(networkConfig, undefined, 2));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
