const ethers = require('ethers');
const fs = require('fs');
const abi = require('ethereumjs-abi')
const network = hre.network.name;

async function main() {
    // todo
    let voteId = 0;

    let votingContractName = "Voting";
    const dir = "networks/";
    const fileName = `${votingContractName}_` + `${network}.json`;
    const data = JSON.parse(await fs.readFileSync(dir + fileName, { encoding: "utf8" }));

    const VotingInstance = await hre.ethers.getContractFactory(votingContractName);
    const Voting = await VotingInstance.attach(data[votingContractName]);

    const tx = await Voting.executeVote(voteId);
    console.log(tx);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });