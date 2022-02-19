const fs = require("fs");
let networkConfig = require('../helper-hardhat-config.json')
const hre = require("hardhat");
const h = require("../utils/helper");

async function main() {

    if(network.name.includes('network')){

        const [deployer] = await ethers.getSigners();
        console.log("Owner:", deployer.address);

        this.listFutureTokens =  networkConfig[network.name].token;

        const Token = await ethers.getContractFactory("SyntERC20");
        let i = 0;
        for(let tkn of this.listFutureTokens){
            let token  = await Token.deploy(tkn.name, tkn.symbol);
            await token.deployed();
            console.log(`Token ${tkn.name} address: ${token.address} network ${network.name}`);
            networkConfig[network.name].token[i].address = token.address;
            i++;
        }

        fs.writeFileSync("./helper-hardhat-config.json", JSON.stringify(networkConfig, undefined, 2));
        console.log(JSON.stringify(networkConfig, undefined, 2))

    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
