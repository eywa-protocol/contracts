// npx hardhat run scripts/gassless/verify.js --network rinkeby

// verify paymaster
let networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    // paymaster verify
    try {
        await hre.run("verify:verify", {
            address: networkConfig[network.name].paymaster,
            constructorArguments: [],
            contract: "contracts/gassless/TokenPaymasterPermitPaymaster.sol:TokenPaymasterPermitPaymaster"
        });
    } catch (e) {
        console.log(e);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });