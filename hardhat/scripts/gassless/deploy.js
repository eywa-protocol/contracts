const fs = require("fs");
let networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");

async function main() {


    this.relayHubRinkeby  = networkConfig[network.name].relayHub;
    this.forwarderRinkeby = networkConfig[network.name].forwarder;
    this.ammPool          = networkConfig[network.name].amm_pool;
    this.token            = networkConfig[network.name].token;

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    const Paymaster = await ethers.getContractFactory("TokenPaymasterPermitPaymaster");
    const paymaster = await Paymaster.deploy();
    await paymaster.deployed();
    console.log("Paymaster address:", paymaster.address);

    this.tx = await paymaster.setRelayHub(this.relayHubRinkeby)
    console.log("RelayHub set:", this.tx);
    this.tx = await paymaster.setTrustedForwarder(this.forwarderRinkeby);
    console.log("ForwarderRinkeby set:", this.tx);
    for(let t of this.token) {
        this.tx = await paymaster.addToken(t.address, this.ammPool);
        console.log("Added token set:", this.tx);
    }

    const RelayHub = await ethers.getContractFactory("RelayHub");
    const relayHub = RelayHub.attach(relayHubRinkeby);
    const amount   = ethers.constants.WeiPerEther.div(1000000000);
    await relayHub.depositFor(paymaster.address, { value: amount });
    console.log("Paymaster deposited for:", amount);


    networkConfig[network.name].paymaster = paymaster.address;
    fs.writeFileSync("./helper-hardhat-config.json", JSON.stringify(networkConfig, undefined, 2));

    // await hre.run("verify:verify", {
    //     address: paymaster.address,
    //     constructorArguments: [
    //     ],
    // })

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
