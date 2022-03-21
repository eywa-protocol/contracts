const fs = require("fs");
let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
const hre = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    let rinkeby_forwarder = '0x787906B6daAb3B648186b96B03b8c34E1370Af24';
    let bsctestnet_forwarder = '0x31FfB75FA444CFd705D370C02DaD9C17a1a4Ac9C';
    let hecotestnet_forwarder = '0x805AB09e70F4d5512cE65543b959B5c7824605f6';
    let avalanchetestnet_forwarder = '0xFf5F019aA1992FDA8FcE512065A0CB0C0eaDD552';
    let mumbai_forwarder = '0x45A54326474830219018B59C0d1312588B66e78F';
    let metistestnet_forwarder = '0x86f5F6e8139eA72479D40888FeD66eE8662Ca7E3';
    let coinextestnet_forwarder = '0x805AB09e70F4d5512cE65543b959B5c7824605f6';

    const _Portal = await ethers.getContractFactory("Portal");
    const portal  = await _Portal.attach(networkConfig[network.name].portal);
    let tx = await portal.setTrustedForwarder(eval(network.name+'_forwarder'));
    await tx.wait();
    console.log(`Forwarder ${eval(network.name+'_forwarder')} were updated on portal ${JSON.stringify(tx.hash)}`);
    let applyedFwd = await portal.trustedForwarder();
    console.log(`New forwarder applyed:  ${applyedFwd == eval(network.name+'_forwarder')}`);

    const _Synthesis = await ethers.getContractFactory("Synthesis");
    const synthesis  = await _Synthesis.attach(networkConfig[network.name].synthesis);
    tx = await synthesis.setTrustedForwarder(eval(network.name+'_forwarder'));
    await tx.wait();
    console.log(`Forwarder ${eval(network.name+'_forwarder')} were updated on synthesis ${JSON.stringify(tx.hash)}`);
    applyedFwd = await synthesis.trustedForwarder();
    console.log(`New forwarder applyed:  ${applyedFwd == eval(network.name+'_forwarder')}`);

    const _Bridge = await ethers.getContractFactory("Bridge");
    const bridge  = await _Bridge.attach(networkConfig[network.name].bridge);
    tx = await bridge.setTrustedForwarder(eval(network.name+'_forwarder'));
    await tx.wait();
    console.log(`Forwarder ${eval(network.name+'_forwarder')} were updated on synthesis ${JSON.stringify(tx.hash)}`);
    applyedFwd = await bridge.trustedForwarder();
    console.log(`New forwarder applyed:  ${applyedFwd == eval(network.name+'_forwarder')}`);

    const _CurveProxy = await ethers.getContractFactory("CurveProxy");
    const curveProxy  = await _CurveProxy.attach(networkConfig[network.name].curveProxy);
    tx = await curveProxy.setTrustedForwarder(eval(network.name+'_forwarder'));
    await tx.wait();
    console.log(`Forwarder ${eval(network.name+'_forwarder')} were updated on curveProxy ${JSON.stringify(tx.hash)}`);
    applyedFwd = await bridge.trustedForwarder();
    console.log(`New forwarder applyed:  ${applyedFwd == eval(network.name+'_forwarder')}`);

    
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
