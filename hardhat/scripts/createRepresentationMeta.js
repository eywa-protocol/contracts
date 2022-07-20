let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../helper-hardhat-config.json')
const { addressToBytes32, timeout } = require('../utils/helper');
const hre = require("hardhat");
const { network } = require('hardhat');

async function main() {

  this.sourceForRepresentation = networkConfig[network.name].sourceForRepresentation;
  this.networks = process.env.NETS.trim().split(",");

  const [deployer] = await ethers.getSigners();
  console.log("Owner:", deployer.address);


  // create representation for crosschain tokens
  for (let netw of this.sourceForRepresentation) {
    if (networkConfig[netw].localToken) {
      let tokens = networkConfig[netw].localToken;
      for (let t of tokens) {
        let tokenAddressBytes32 = addressToBytes32(t.address);
        if (await synthesis.representationSynt(tokenAddressBytes32) === '0x0000000000000000000000000000000000000000') {
          this.tx = await synthesis.createRepresentation(tokenAddressBytes32, "18", `${t.name}`, `${t.symbol}`,
            networkConfig[netw].chainId, networkConfig[netw].netwiker)
          console.log(`createRepresentation for ${t.name} token on ${network.name} source from ${netw}: ${this.tx.hash}`);
          await this.tx.wait();
        }
      }
    }
  }


  let tokens = networkConfig[network.name].localToken;
  for (let t of tokens) {
    let tokenAddressBytes32 = addressToBytes32(t.address);
    if (await synthesis.representationSynt(tokenAddressBytes32) === '0x0000000000000000000000000000000000000000') {
      this.tx = await portal["approveRepresentationRequest(bytes32,uint8)"](tokenAddressBytes32, "18");
      console.log(`approveRepresentationRequest for ${t.name}: ${t.address} token on ${network.name}: ${this.tx.hash}`);
      await this.tx.wait();
    }
  }



  // create representation for EUSD
  for (let netw of this.sourceForRepresentation) {
    if (networkConfig[netw].hubPool.address) {
      let tokens = networkConfig[netw].hubPool.address;
      for (let t of tokens) {
        let tokenAddressBytes32 = addressToBytes32(t.address);
        if (await synthesis.representationSynt(tokenAddressBytes32) === '0x0000000000000000000000000000000000000000') {
          this.tx = await synthesis.createRepresentation(tokenAddressBytes32, "18", "EUSD", "EUSD",
            networkConfig[netw].chainId, networkConfig[netw].netwiker)
          console.log(`createRepresentation for ${t.name} token on ${network.name} source from ${netw}: ${this.tx.hash}`);
          await this.tx.wait();
        }
      }
    }
  }


  let token = networkConfig[network.name].hubPool.address;
  for (let t of token) {
    let tokenAddressBytes32 = addressToBytes32(t);
    if (await synthesis.representationSynt(tokenAddressBytes32) === '0x0000000000000000000000000000000000000000') {
      this.tx = await portal["approveRepresentationRequest(bytes32,uint8)"](tokenAddressBytes32, "18");
      console.log(`approveRepresentationRequest for EUSD: ${t} token on ${network.name}: ${this.tx.hash}`);
      await this.tx.wait();
    }
  }


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
