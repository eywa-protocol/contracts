const fs = require("fs");
const { network } = require("hardhat");
let deployInfo = require('../../helper-hardhat-config.json')

async function main() {
    console.log("\n DAO contracts  deployment");
    const [deployer] = await ethers.getSigners();
    console.log("Network:", network.name);
    console.log("Network Id:", await web3.eth.net.getId());
    console.log(`Deploying with the account: ${deployer.address}`);
    const balance = await deployer.getBalance();
    console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);
    console.log("Deployment in progress...");

    const LiquidityGauge = await ethers.getContractFactory('LiquidityGauge')
    const VotingEscrow = await ethers.getContractFactory('VotingEscrow')
    const GaugeController = await ethers.getContractFactory('GaugeController')
    const GaugeProxy = await ethers.getContractFactory('GaugeProxy')
    const Minter = await ethers.getContractFactory('Minter')
    const ERC20CRV = await ethers.getContractFactory('ERC20CRV')

    if (network.name == "network2" || network.name == "mumbai") {
        // deploy eywa `ERC20CRV`
        // const name = "Vote-escrowed EYWA"
        // const symbol = "veEYWA"
        // const decimals = 18
        // const version = "0.0.1"

        const eywa = await ERC20CRV.deploy("EYWA-TOKEN", "EYWA", 18)
        await eywa.deployed()
        deployInfo[network.name].dao.eywa = eywa.address

        // deploy voting escrow
        // @param token_addr `ERC20CRV` token address
        // @param name Token name
        // @param symbol Token symbol
        // @param version Contract version - required for Aragon compatibility
        const votingEscrow = await VotingEscrow.deploy(eywa.address, "Vote-escrowed EYWA", "xEYWA", "0.0.1")
        await votingEscrow.deployed()
        deployInfo[network.name].dao.votingEscrow = votingEscrow.address

        // @param _token `ERC20CRV` contract address
        // @param _voting_escrow `VotingEscrow` contract address
        const gaugeController = await GaugeController.deploy(eywa.address, votingEscrow.address)
        await gaugeController.deployed()
        deployInfo[network.name].dao.gaugeController = gaugeController.address
        await gaugeController.add_type("Liquidity", "1000000000000000000" /* 10**18 */, { gasLimit: 1000000 }) //new web3.utils.BN(10).pow(new web3.utils.BN(18)

        // deploy minter 
        // @param token: address, 
        // @param controller: address
        const minter = await Minter.deploy(eywa.address, gaugeController.address)
        await minter.deployed()
        deployInfo[network.name].dao.minter = minter.address
        await eywa.set_minter(minter.address)

        // deploy gauge
        for (let i = 0; i < deployInfo[network.name].crosschainPool.length; i++) {
            let owner = deployer.address
            let lpToken = deployInfo[network.name].crosschainPool[i].lp[0]

            // deploy LiquidityGauge 
            // @param lp_addr: address, 
            // @param minter: address
            // @param admin: address
            let gauge = await LiquidityGauge.deploy(lpToken.address, minter.address, owner)
            await gauge.deployed()
            deployInfo[network.name].crosschainPool[i].gauge = gauge.address
            // await gauge.self

            //register gauge
            await gaugeController.add_gauge(gauge.address, 0, "10000000000000000000"/*weight*/,{ gasLimit: 1000000 })
        }
        //add local gauge
        let gaugeLocal = await LiquidityGauge.deploy(deployInfo[network.name].localPool.lp.address, minter.address, deployer.address)
        await gaugeLocal.deployed()
        await gaugeController.add_gauge(gaugeLocal.address, 0, "10000000000000000000"/*weight*/,{ gasLimit: 1000000 })
        deployInfo[network.name].localPool.gauge = gaugeLocal.address
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
