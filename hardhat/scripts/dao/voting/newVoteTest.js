const ethers = require('ethers');
const abi = require('ethereumjs-abi')
const network = hre.network.name;

async function genHexString(interface, sig, argList) {
    let funcHex = interface.encodeFunctionData(sig, argList);
    return funcHex;
}

async function delegateData(ProxyAdminAddress, sig, argList) {
    const Contract = await hre.ethers.getContractFactory("ExecutionTarget");
    let callDataBytes = await genHexString(Contract.interface, sig, argList);

    return [ProxyAdminAddress, callDataBytes.toLowerCase()];
}

const createExecutorId = id => `0x${String(id).padStart(8, '0')}`

function encodeCallScript(actions, specId = 1) {
    return actions.reduce((script, { to, calldata }) => {
        const addr = abi.rawEncode(['address'], [to]).toString('hex')
        const length = abi.rawEncode(['uint256'], [(calldata.length - 2) / 2]).toString('hex')
        return script + addr.slice(24) + length.slice(56) + calldata.slice(2)
    }, createExecutorId(specId))
}


async function main() {
    // prefix for aragon contract
    let specId = 1;
    // @todo add addresses
    const testAddress = "0x1f0032B275d2B257f14243ce694D5024b4cf9Bac";
    
    // const from = "0x287b073e286ccd4a7d3d7e1b7f8f20ca4432ee51";
    // const oppositeBridge = "0x287b073e286ccd4a7d3d7e1b7f8f20ca4432ee51";
    // const to = "0x287b073e286ccd4a7d3d7e1b7f8f20ca4432ee51";
    [callAddress, callDataBytes] = await delegateData(testAddress, "execute", []);
    let completeCallBytes = encodeCallScript([{ to: callAddress, calldata:  callDataBytes}], specId)

    // todo add voting address
    let votingAddress = '0x287b073e286ccd4a7d3d7e1b7f8f20ca4432ee51';
    let VotingContractName = "Voting";
    const VotingInstance = await hre.ethers.getContractFactory(VotingContractName);
    const Voting = await VotingInstance.attach(votingAddress);

    const tx = await Voting.functions["newVote(bytes,string,bool,bool)"](completeCallBytes, "add bind", false, false);
    await tx.wait();
    console.log(tx.hash);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
