const fs = require("fs");
const { network } = require("hardhat");
const { parseJsonText } = require("typescript");
let deployInfo = require('../../helper-hardhat-config.json')


async function main() {
    console.log("\n DAO contracts  deployment");
    const [admin] = await ethers.getSigners();
    console.log("Network:", network.name);
    console.log("Network Id:", await web3.eth.net.getId());
    console.log(`Deploying with the account: ${admin.address}`);
    const balance = await admin.getBalance();
    console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);
    console.log("Deployment in progress...");

    const LiquidityGauge = await ethers.getContractFactory('LiquidityGauge')
    const VotingEscrow = await ethers.getContractFactory('VotingEscrow')
    const GaugeController = await ethers.getContractFactory('GaugeController')
    const PoolProxy = await ethers.getContractFactory('PoolProxy')
    const Minter = await ethers.getContractFactory('Minter')
    const ERC20CRV = await ethers.getContractFactory('ERC20CRV')

    if (network.name == "network2" || network.name == "mumbai") {
    
        // deploy gauge controller
        // @param _token `ERC20CRV` contract address
        // @param _voting_escrow `VotingEscrow` contract address
        const gaugeController = await GaugeController.attach("0x6eAb3449E280EBA40CF612B6789AB4f79b943b11")
        await gaugeController.deployed()
        await gaugeController.add_type("Liquidity",  10 ** 18)
        deployInfo[network.name].dao.gaugeController = gaugeController.address

        // deploy gauge controller
     
    }

   

    // write out the deploy configuration 
    fs.writeFileSync("./helper-hardhat-config.json", JSON.stringify(deployInfo, undefined, 2));
    console.log("DAO contracts deployed!\n");

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });