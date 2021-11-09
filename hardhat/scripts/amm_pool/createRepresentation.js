let networkConfig = require('../../helper-hardhat-config.json')
const hre = require("hardhat");
const { addressToBytes32 } = require('../../utils/helper');

async function main() {

    this.s          = networkConfig[network.name].synthesis;
    this.sourceForRepresentation =  networkConfig[network.name].sourceForRepresentation;

    const [deployer] = await ethers.getSigners();
    console.log("Owner:", deployer.address);

    const Synthesis = await ethers.getContractFactory("Synthesis");
    const synthesis = Synthesis.attach(this.s);
    // origin tokon should be from another place
    for(let netw of this.sourceForRepresentation) {
      let tokens = networkConfig[netw].token;
      for(let t of tokens) {
        if(await synthesis.representationSynt(t.address) === '0x0000000000000000000000000000000000000000'){
           this.tx = await synthesis.createRepresentation(t.address, `e${t.name}`, `e${t.symbol}(${networkConfig[netw].netwiker})`);
           console.log(`createRepresentation for synthesis on ${network.name} source from ${netw}: ${this.tx.hash}`); 
        }
      }
    }
}


main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
