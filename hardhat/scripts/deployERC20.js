const fs = require("fs");
let networkConfig = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../helper-hardhat-config.json')
const hre = require("hardhat");
const h = require("../utils/helper");

async function main() {

    if(network.name.includes('network') || network.name === 'harmonylocal'){

        const [deployer] = await ethers.getSigners();
        console.log("Owner:", deployer.address);

        this.listFutureTokens =  networkConfig[network.name].token;

        const Token = await ethers.getContractFactory("TestToken");
        let i = 0;
        for(let tkn of this.listFutureTokens){
            if(tkn.address === '0x0000000000000000000000000000000000000000'){
                let token  = await Token.deploy(tkn.name, tkn.symbol);
                await token.deployed();
                await token.deployTransaction.wait();
                console.log(`Token ${tkn.name} address: ${token.address} network ${network.name}`);
                networkConfig[network.name].token[i].address = token.address;
                i++;
            }
        }

        fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./helper-hardhat-config.json",
            JSON.stringify(networkConfig, undefined, 2));
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
