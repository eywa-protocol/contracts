// $ npx hardhat run scripts/bridge/verify.js --network rinkeby

// verify Forwarder, proxy Bridge and MockDexPool
async function main() {
    // Get addresses from file

    // Verify block

    // Contracts verify
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