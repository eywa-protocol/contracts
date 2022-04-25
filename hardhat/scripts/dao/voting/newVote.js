const ethers = require('ethers');
const fs = require('fs');
const abi = require('ethereumjs-abi')
const network = hre.network.name;

async function genHexString(interface, sig, argList) {
    let funcHex = await interface.encodeFunctionData(sig, argList);
    return funcHex;
}

async function delegateData(ContractName, sig, argList) {

    // Bridge address
    let bridgeAddress = '0x...';
    const ContractInstance = await hre.ethers.getContractFactory(ContractName);
    const Contract = await ContractInstance.attach(bridgeAddress);

    let callDataBytes = await genHexString(Contract.interface, sig, argList);

    return [bridgeAddress, callDataBytes.toLowerCase()];
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
    // @todo
    let votingAddress = '0x...'

    let contractName = 'Bridge';
    let sig = 'addContractBind';
    let argList = ['from','oppositeBridge','to'];

    let specId = 1;
    [callAddress, callDataBytes] = await delegateData(contractName, sig, argList);
    let completeCallBytes = await encodeCallScript([{ to: callAddress, calldata:  callDataBytes}], specId)
    console.log(completeCallBytes.toString());

    let votingContractName = "Voting";

    const VotingInstance = await hre.ethers.getContractFactory(votingContractName);
    const Voting = await VotingInstance.attach(votingAddress);

    const tx = await Voting.functions["newVote(bytes,string,bool,bool)"](completeCallBytes, argList, false, false);
    console.log(tx.hash);
    await tx.wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });