// npx hardhat run scripts/dao/verify-dao.js --network mumbai

// verify paymaster
let networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    let eywaAddress = networkConfig[network.name].dao.eywa;
    let votingEscrowAddress = networkConfig[network.name].dao.votingEscrow;
    const name = "EYWA-GOV";
    const symbol = "EYWA-GOV";
    const decimals = 18;
    const version = '0.0.1';

    // eywa verify
    try {
        await hre.run("verify:verify", {
            address: eywaAddress,
            constructorArguments: [name, symbol, decimals],
            contract: "contracts/dao/ERC20CRV.vy:ERC20CRV"
        });
    } catch (e) {
        console.log(e);
    }

    // voting escrow
    try {
        await hre.run("verify:verify", {
            address: votingEscrowAddress,
            constructorArguments: [eywaAddress, symbol, symbol, version],
            contract: "contracts/dao/VotingEscrow.vy:Voting Escrow"
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