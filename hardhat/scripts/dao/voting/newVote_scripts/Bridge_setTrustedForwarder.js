const ethers = require('ethers');
const abi = require('ethereumjs-abi')
const network = hre.network.name;

let TARGET_ADDRESS = '0x..'; // Bridge address
let targetContractName = 'Bridge'; /// Bridge name
let targetFuncSig = 'setTrustedForwarder'; // Bridge function
let targetArgList = ['0x..']; // params for setTrustedForwarder function
let aragonVotingAddress = '0x287b073e286ccd4a7d3d7e1b7f8f20ca4432ee51';

async function genHexString(interface, sig, argList) {
    let funcHex = await interface.encodeFunctionData(sig, argList);
    return funcHex;
}

async function delegateData(ContractName, sig, argList) {
    const ContractInstance = await hre.ethers.getContractFactory(ContractName);
    const contract = await ContractInstance.attach(TARGET_ADDRESS);

    let callDataBytes = await genHexString(contract.interface, sig, argList);

    return [TARGET_ADDRESS, callDataBytes.toLowerCase()];
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
    let specId = 1;
    [callAddress, callDataBytes] = await delegateData(targetContractName, targetFuncSig, targetArgList);
    let completeCallBytes = await encodeCallScript([{ to: callAddress, calldata: callDataBytes }], specId)
    console.log(completeCallBytes.toString());

    let votingContractName = "Voting";
    const VotingInstance = await hre.ethers.getContractFactory(votingContractName);
    const voting = await VotingInstance.attach(aragonVotingAddress);

    const tx = await voting.functions["newVote(bytes,string,bool,bool)"](completeCallBytes, targetArgList, false, false);
    console.log(tx.hash);
    await tx.wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
