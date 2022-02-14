// $ npx hardhat run scripts/amm_pool/verify.js --network rinkeby

// verify proxy Portal, proxy Synthesis and FrontHelper
async function main() {
    // Get addresses from file

    // Verify block

    // Contracts verify
    try {
        await hre.run("verify:verify", {
            address: '',
            constructorArguments: [],
            contract: "contracts/amm_pool/Portal.sol:Portal"
        });
    } catch (e) {
        console.log(e);
    }

    try {
        await hre.run("verify:verify", {
            address: '',
            constructorArguments: [],
            contract: ""
        });
    } catch (e) {
        console.log(e);
    }

    try {
        await hre.run("verify:verify", {
            address: '',
            constructorArguments: [],
            contract: ""
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