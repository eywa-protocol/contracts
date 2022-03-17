let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')
const hre = require("hardhat");
const { addressToBytes32, timeout } = require('../../utils/helper');

async function main() {
    // TODO Solana Bridge ProgramId should be calculated dynamically
    let pidBridge = "0x0adc84829c10a6e1d15291c6a128f6b77448e44551f6b49faf7ac2c42f2e62e0"
    let pidTestStub = "0x70d257a99aaa3ec60da9af20bddf2a0fd652d3e39c9d5ece041894795649cd60"

    this.bridgeAdr  = networkConfig[network.name].bridge;
    this.s          = networkConfig[network.name].synthesis;
    this.p          = networkConfig[network.name].portal;
    this.cp         = networkConfig[network.name].curveProxy;
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
       let curveProxy  = networkConfig[netw].curveProxy;
       let mockDexPool  = networkConfig[netw].mockDexPool;
       let chainid  = networkConfig[netw].chainId;
    try{
       this.tx = await bridgeA.addContractBind(
        addressToBytes32(this.s),
        addressToBytes32(bridgeB),
        addressToBytes32(portal)
        );
       console.log(`addContractBind for synthesis on ${network.name} with ${netw}: ${this.tx.hash}`);
       await this.tx.wait();
       this.tx = await bridgeA.addContractBind(
        addressToBytes32(this.p),
        addressToBytes32(bridgeB),
        addressToBytes32(synth)
        );
       console.log(`addContractBind for portal on ${network.name} with ${netw}: ${this.tx.hash}`);
       await this.tx.wait();

        this.tx = await bridgeA.addContractBind(
            addressToBytes32(mDP),
            addressToBytes32(bridgeB),
            addressToBytes32(mockDexPool)
        );
        console.log(`addContractBind for mockDexPool on ${network.name} with ${netw}: ${this.tx.hash}`);
        await this.tx.wait();

        console.log(`-> binding solana program to MockDexPool ${addressToBytes32(mDP)} to send request to solana`)
        console.log(`-> pidBridge ${pidBridge}`)
       this.tx = await bridgeA.addContractBind(
        addressToBytes32(mDP),
        pidBridge,
        pidTestStub
        );
        console.log(`-> tx ${tx}`)
       console.log(`-> addContractBind for mockDexPool on solana ${network.name} with ${netw}: ${this.tx.hash}`);
       await this.tx.wait();
//-----
      this.tx = await bridgeA.addContractBind(
        addressToBytes32(this.p),
        addressToBytes32(bridgeB),
        addressToBytes32(curveProxy)
        );
      console.log(`addContractBind for Curve proxy > Portal on ${network.name} with ${netw}: ${this.tx.hash}`);
      await this.tx.wait();

      this.tx = await bridgeA.addContractBind(
        addressToBytes32(this.s),
        addressToBytes32(bridgeB),
        addressToBytes32(curveProxy)
        );
      console.log(`addContractBind for Curve proxy > Synthesis on ${network.name} with ${netw}: ${this.tx.hash}`);
      await this.tx.wait();

       this.tx = await bridgeA.addContractBind(
        addressToBytes32(this.cp),
        addressToBytes32(bridgeB),
        addressToBytes32(portal)
        );
       console.log(`addContractBind for Curve proxy > Portal on ${network.name} with ${netw}: ${this.tx.hash}`);
       await this.tx.wait();

       this.tx = await bridgeA.addContractBind(
        addressToBytes32(this.cp),
        addressToBytes32(bridgeB),
        addressToBytes32(synth)
        );
       console.log(`addContractBind for Curve proxy > Synthesis on ${network.name} with ${netw}: ${this.tx.hash}`);
       await this.tx.wait();

       this.tx = await bridgeA.addContractBind(
        addressToBytes32(this.cp),
        addressToBytes32(bridgeB),
        addressToBytes32(curveProxy)
        );
       console.log(`addContractBind for Curve proxy > Curve proxy on ${network.name} with ${netw}: ${this.tx.hash}`);
       await this.tx.wait();



       this.tx = await bridgeA.addContractBind(
        addressToBytes32(this.s),
        addressToBytes32(bridgeB),
        addressToBytes32(synth)
        );
       console.log(`addContractBind for Synthesis  > Synthesis on ${network.name} with ${netw}: ${this.tx.hash}`);
       await this.tx.wait();

      //  this.tx = await bridgeA.addContractBind(
      //   addressToBytes32(synth),
      //   addressToBytes32(bridgeB),
      //   addressToBytes32(this.s)
      //   );
      //  console.log(`addContractBind for Synthesis  > Synthesis on ${network.name} with ${netw}: ${this.tx.hash}`);
      //  await this.tx.wait();

     }catch(e){
          const nuLL = '0x0000000000000000000000000000000000000000';
          if(e.message.indexOf('cannot estimate gas') >= 0 &&
             (portal === nuLL || bridgeB === nuLL || mockDexPool === nuLL || curveProxy === nuLL)){
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