let networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");

async function main() {

    this.bridgeAdr  = networkConfig[network.name].bridge;
    this.s          = networkConfig[network.name].synthesis;
    this.p          = networkConfig[network.name].portal;

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    const Bridge = await ethers.getContractFactory("Bridge");
    const bridge = Bridge.attach(this.bridgeAdr);
    if(await bridge.dexBind(this.s) === false){
       this.tx = await bridge.updateDexBind(this.s, true);
       console.log(`updateDexBind for synthesis on ${network.name}: ${this.tx.hash}`);
    }
    if(await bridge.dexBind(this.p) === false){
        this.tx = await bridge.updateDexBind(this.p, true);
        console.log(`updateDexBind for portal on ${network.name}: ${this.tx.hash}`);
    }

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
