// $ npx hardhat run scripts/bridge/verifyToService.js --network rinkeby

// verify Forwarder, proxy Bridge and MockDexPool
let networkConfig = require('../../helper-hardhat-config.json')
const { upgrades } = require("hardhat");
const hre = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);


}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });