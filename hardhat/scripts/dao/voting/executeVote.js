const ethers = require('ethers');
const fs = require('fs');
const abi = require('ethereumjs-abi')
const network = hre.network.name;

async function main() {
    // todo add vote id and voting address
    let voteId = 0;
    let votingAddress = '';

    let votingContractName = "Voting";
    const VotingInstance = await hre.ethers.getContractFactory(votingContractName);
    const Voting = await VotingInstance.attach(votingAddress);

    const tx = await Voting.executeVote(voteId);
    console.log(tx);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });