let networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");
const h = require("../../utils/helper");
const { addressToBytes32 } = require('../../utils/helper');

async function main() {

    this.bridgeAdr  = networkConfig[network.name].bridge;
    this.s          = networkConfig[network.name].synthesis;
    this.p          = networkConfig[network.name].portal;
    this.sourceForRepresentation =  networkConfig[network.name].sourceForRepresentation;

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    const Bridge = await ethers.getContractFactory("Bridge");
    const bridgeA = Bridge.attach(this.bridgeAdr);
    const mDP = networkConfig[network.name].mockDexPool;


    for(let netw of this.sourceForRepresentation) {

       let bridgeB = networkConfig[netw].bridge;
       let portal  = networkConfig[netw].portal;
       let synth   = networkConfig[netw].synthesis;
       let mockDexPool  = networkConfig[netw].mockDexPool;
       let chainid  = networkConfig[netw].chainId;
    try{
       this.tx = await bridgeA.addContractBind(
        addressToBytes32(this.s),
        addressToBytes32(bridgeB),
        addressToBytes32(portal)
        );
       console.log(`addContractBind for synthesis on ${network.name} with ${netw}: ${this.tx.hash}`);
       this.tx = await bridgeA.addContractBind(
        addressToBytes32(this.p),
        addressToBytes32(bridgeB),
        addressToBytes32(synth)
        );
       console.log(`addContractBind for portal on ${network.name} with ${netw}: ${this.tx.hash}`);
       await h.timeout(5_000);

       this.tx = await bridgeA.addContractBind(
        addressToBytes32(mDP),
        addressToBytes32(bridgeB),
        addressToBytes32(mockDexPool)
        );
       console.log(`addContractBind for mockDexPool on ${network.name} with ${netw}: ${this.tx.hash}`);
       await h.timeout(5_000);
     }catch(e){
          const nuLL = '0x0000000000000000000000000000000000000000';
          if(e.message.indexOf('cannot estimate gas') >= 0 &&
             (portal === nuLL || bridgeB === nuLL || mockDexPool === nuLL)){
            console.log(`WARNING: Can't bind with ${netw}. Check json config.`);
            break;
          }
          throw Error(e.message);
      }
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
