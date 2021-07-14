"use strict";

const { exec } = require('child_process');
const { networks }         = require('../truffle-config');


async function migrateLocalnetwork(deployer, network, accounts) {
    const [proxyAdminOwner, newAdmin, anotherAccount] = accounts;
    console.log(process.cwd())
    const NodeList = artifacts.require('NodeList');
    const Bridge = artifacts.require('Bridge');
    const MockDexPool = artifacts.require('MockDexPool');
    const WhitelistPaymaster = artifacts.require('WhitelistPaymaster');
    await deployer.deploy(WhitelistPaymaster)
    let whitelistPaymaster = await WhitelistPaymaster.deployed();


    console.log("whitelistPaymaster", whitelistPaymaster.address)


    const RelayHub = artifacts.require('RelayHub')


    await deployer.deploy(NodeList, {from: proxyAdminOwner});
    let nodeList = await NodeList.deployed();
    console.log(nodeList.address)

    await deployer.deploy(Bridge, nodeList.address, {from: proxyAdminOwner});
    let bridge = await Bridge.deployed();
    console.log("bridge.address ", bridge.address)

    await deployer.deploy(MockDexPool, bridge.address,  { from: proxyAdminOwner });
    let dexpool = await MockDexPool.deployed();
    console.log("MockDexPool.address ", dexpool.address)

    await bridge.updateDexBind(dexpool.address, true);

    let env_file = "networks_env/env_connect_to_" + network + ".env";
    let env_test_file = "networks_env/env_test_for_" + network + ".env";

    console.log("env_file ",env_file)

    const rpcUrl = "ws://"+networks[network].host+":"+networks[network].port

    exec(`${process.cwd()}/scripts/bash/update_env_adapter.sh ${rpcUrl} ${networks[network].network_id} ${bridge.address} ${nodeList.address} ${dexpool.address} ${env_file} ${network.toUpperCase()} ${env_test_file}`
        , {maxBuffer: 1024 * 100000000}, (err, stdout, stderr) => {
        });

}


async function migratGSN(deployer, network, accounts) {
    const [proxyAdminOwner, newAdmin, anotherAccount] = accounts;
    const RelayHub = artifacts.require('RelayHub');
    const relayHubAddress = require('../build/gsn/RelayHub.json').address;
    const relayHub = await RelayHub.at(relayHubAddress);



    const WhitelistPaymaster = artifacts.require('WhitelistPaymaster');

    const forwarder = await require( '../build/gsn/Forwarder.json' ).address

    await deployer.deploy(WhitelistPaymaster)

    const paymaster = await WhitelistPaymaster.deployed()
    await paymaster.setRelayHub(relayHubAddress)
    await paymaster.setTrustedForwarder(forwarder)
    // This is the first ganache address, when started with "ganache-cli -d"
    await paymaster.whitelistSender('0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1')
    console.log(`RelayHub(${relayHubAddress}) set on Paymaster(${WhitelistPaymaster.address})`)
    // to add more addresses to the whitelist, open truffle console and run:
    // const pm = await WhitelistPaymaster.deployed()
    // pm.whitelistSender('0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1')



    await relayHub.depositFor(paymaster.address, {value: 1e18.toString()})
    console.log(`1 ETH deposited to Paymaster(${WhitelistPaymaster.address})`)

    const NodeListWithGSN = artifacts.require('NodeListWithGSN');
    await deployer.deploy(NodeListWithGSN, forwarder, {from: proxyAdminOwner});
    let nodeListWithGSN = await NodeListWithGSN.deployed();
    console.log("nodeListWithGSN", nodeListWithGSN.address)
}



module.exports = {
    migrateLocalnetwork,
    migratGSN
};

