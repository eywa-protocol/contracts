let networkConfig = require('../../helper-hardhat-config.json')
const { addressToBytes32, timeout } = require('../../utils/helper');
const hre = require("hardhat");

async function main() {

  this.s = networkConfig[network.name].synthesis;
  this.p = networkConfig[network.name].portal;
  this.sourceForRepresentation = networkConfig[network.name].sourceForRepresentation;
  this.networks = ["network1","network2","network3"];

  const [deployer] = await ethers.getSigners();
  console.log("Owner:", deployer.address);

  const Synthesis = await ethers.getContractFactory("Synthesis");
  const synthesis = Synthesis.attach(this.s);
  const Portal = await ethers.getContractFactory("Portal");
  const portal = Portal.attach(this.p);
  // origin token should be from another place
  for (let netw of this.sourceForRepresentation) {
    let tokens = networkConfig[netw].token;
    for (let t of tokens) {
      let tokenAddressBytes32 = addressToBytes32(t.address);
      if (await synthesis.representationSynt(tokenAddressBytes32) === '0x0000000000000000000000000000000000000000') {
        this.tx = await synthesis.createRepresentation(tokenAddressBytes32, "18", `${t.name}`, `${t.symbol}(${networkConfig[netw].netwiker})`,
          networkConfig[netw].chainId, networkConfig[netw].netwiker)
        console.log(`createRepresentation for synthesis on ${network.name} source from ${netw}: ${this.tx.hash}`);
        await this.tx.wait();
      }
    }
  }

  // create representation for crosschain tokens
  for (let netw of this.sourceForRepresentation) {
    if (networkConfig[netw].localToken) {
      let tokens = networkConfig[netw].localToken;
      for (let t of tokens) {
        let tokenAddressBytes32 = addressToBytes32(t.address);
        if (await synthesis.representationSynt(tokenAddressBytes32) === '0x0000000000000000000000000000000000000000') {
          this.tx = await synthesis.createRepresentation(tokenAddressBytes32, "18", `${t.name}`, `${t.symbol}(${networkConfig[netw].netwiker})`,
            networkConfig[netw].chainId, networkConfig[netw].netwiker)
          console.log(`createRepresentation for ${t.name} token on ${network.name} source from ${netw}: ${this.tx.hash}`);
          await this.tx.wait();
        }
      }
    }
  }

  // for (let netw of networks) {
  //     let tokens = networkConfig[netw].localToken;
  //     for (let t of tokens) {
  //       let tokenAddressBytes32 = addressToBytes32(t.address);
  //       if (await synthesis.representationSynt(tokenAddressBytes32) === '0x0000000000000000000000000000000000000000') {
  //         this.tx = await portal.approveRepresentationRequest( t.address, "18"/*_decimals*/)
  //         console.log(`approveRepresentationRequest for ${t.name} token on ${network.name} source from ${netw}: ${this.tx.hash}`);
  //         await this.tx.wait();
  //       }
  //    }
  // }

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
