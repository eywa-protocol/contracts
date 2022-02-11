const fs = require("fs");
const { network, web3 } = require("hardhat");
let deployInfo = require('../../helper-hardhat-config.json')


async function main() {
    console.log("\nDAO contracts  deployment");
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
    const Voting = await ethers.getContractFactory('Voting')
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
        const votingEscrow = await VotingEscrow.deploy(eywa.address, "Vote-escrowed EYWA", "veEYWA", "0.0.1")
        await votingEscrow.deployed()
        deployInfo[network.name].dao.votingEscrow = votingEscrow.address

        // deploy gauge controller
        // @param _token `ERC20CRV` contract address
        // @param _voting_escrow `VotingEscrow` contract address
        const gaugeController = await GaugeController.deploy(eywa.address, votingEscrow.address)
        await gaugeController.deployed()

        await gaugeController.add_type("Liquidity", "1000000000000000000" /* 10**18 */, { gasLimit: 1000000 }) //new web3.utils.BN(10).pow(new web3.utils.BN(18)
        deployInfo[network.name].dao.gaugeController = gaugeController.address

        // deploy gauge controller
        // @param _token `ERC20CRV` contract address
        // @param _voting_escrow `VotingEscrow` contract address
        const poolProxy = await PoolProxy.deploy(admin.address, admin.address, admin.address)
        await poolProxy.deployed()
        deployInfo[network.name].dao.poolProxy = poolProxy.address

        // deploy minter 
        // @param token: address, 
        // @param controller: address
        const minter = await Minter.deploy(eywa.address, gaugeController.address)
        await minter.deployed()
        deployInfo[network.name].dao.minter = minter.address

        // deploy gauge
        let gauge = []
        for (let i = 0; i < deployInfo[network.name].crosschainPool.length; i++) {
            // let admin = admin.address
            let lpToken = deployInfo[network.name].crosschainPool[i].lp[0]

            // deploy LiquidityGauge 
            // @param lp_addr: address, 
            // @param minter: address
            // @param admin: address
            gauge[i] = await LiquidityGauge.deploy(lpToken.address, minter.address, admin.address)
            await gauge[i].deployed()
            deployInfo[network.name].crosschainPool[i].gauge = gauge[i].address

            // console.log(gaugeController)
            //register gauge
            await gaugeController.add_gauge(gauge[i].address, 0, 0/*weight*/, { gasLimit: 1000000 })
        }


        // deploy aragon voting contract 
        const _token = votingEscrow.address                       //Address that will be used as governance token
        const _supportRequiredPct = "510000000000000000"  //Percentage of yeas in casted votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
        const _minAcceptQuorumPct = "510000000000000000"   //Percentage of yeas in total possible votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
        const _voteTime = "36000"                         //Seconds that a vote will be open for token holders to vote (unless enough yeas or nays have been cast to make an early decision)
        const _minBalance = "0"                           //Minumum balance that a token holder should have to create a new vote
        const _minTime = "0"                              //Minimum time between a user's previous vote and creating a new vote
        const _minBalanceLowerLimit = "0"                 //Hardcoded lower limit for _minBalance on initialization
        const _minBalanceUpperLimit = "0"                 //Hardcoded upper limit for _minBalance on initialization
        const _minTimeLowerLimit = "0"                    //Hardcoded lower limit for _minTime on initialization
        const _minTimeUpperLimit = "0"                    //Hardcoded upper limit for _minTime on initialization

        const voting = await upgrades.deployProxy(Voting, [
            _token,
            _supportRequiredPct,
            _minAcceptQuorumPct,
            _voteTime,
            _minBalance,
            _minTime,
            _minBalanceLowerLimit,
            _minBalanceUpperLimit,
            _minTimeLowerLimit,
            _minTimeUpperLimit
        ], { initializer: 'initialize' });
        deployInfo[network.name].dao.voting = voting.address

        console.log(`
            "ERC20EYWA": ${eywa.address},
            "VotingEscrow": ${votingEscrow.address},
            "GaugeController": ${gaugeController.address},
            "Minter": ${minter.address},
            "LiquidityGauge": {${gauge}},
            "LiquidityGaugeReward": {},
            "PoolProxy": ${poolProxy.address},
            "Voting": ${voting.address},
        `)


        //  Create a new vote about "`_metadata`"
        const _executionScript = "0x0"       //EVM script to be executed on approval
        const _metadata = "TEST"          //Vote metadata
        const _castVote = false           //Whether to also cast newly created vote
        const _executesIfDecided = false  //Whether to also immediately execute newly created vote if decided
        
        const voteId = await voting.newVote(
            _executionScript,
            _metadata,
            _castVote,
            _executesIfDecided
        )
        console.log(voteId)
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