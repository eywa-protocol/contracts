const fs = require("fs");
const { network, web3, ethers } = require("hardhat");
let deployInfo = require('../../helper-hardhat-config.json')
// const { encodeCallScript} = require( "./evmscript.ts");
const { getEventArgument } = require("./events.js");
const defaultAbiCoder = new ethers.utils.AbiCoder;
const { BigNumber } = require("@ethersproject/bignumber");

const toDecimals = (
    amount,
    decimals = 18
) => {
    const [integer, decimal] = String(amount).split(".");
    return BigNumber.from(
        (integer != "0" ? integer : "") + (decimal || "").padEnd(decimals, "0") ||
        "0"
    );
}
const pct16 = (x) => toDecimals(x, 16);
const votePct = (pct) => BigNumber.from(pct16(pct));

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

    if (network.name == "network2" || network.name == "rinkeby") {
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









        // // deploy the DAO token
        // const MiniMeToken = await ethers.getContractFactory("MiniMeToken");
        // const tokenDecimals = 18;
        // const miniMeToken = await MiniMeToken.deploy(
        //     ethers.constants.AddressZero,
        //     ethers.constants.AddressZero,
        //     0,
        //     "Test Token",
        //     tokenDecimals,
        //     "TT",
        //     true
        // )

        // await miniMeToken.generateTokens(
        //     admin.address,
        //     ethers.utils.parseEther("100.0")
        // );
        // await miniMeToken.generateTokens(admin.address, ethers.utils.parseEther("100.0"));



        // // deploy DAO registry stuff
        // const Kernel = await ethers.getContractFactory("Kernel");
        // const ACL = await ethers.getContractFactory("ACL");
        // const EVMScriptRegistryFactory = await ethers.getContractFactory(
        //     "EVMScriptRegistryFactory"
        // );
        // const DAOFactory = await ethers.getContractFactory("DAOFactory");

        // const kernelBase = await Kernel.deploy(true);
        // const aclBase = await ACL.deploy();
        // const registryFactory = await EVMScriptRegistryFactory.deploy();




        // const daoFactory = await DAOFactory.deploy(
        //     kernelBase.address,
        //     aclBase.address,
        //     registryFactory.address
        // )
        // const rootAddress = await admin.address;

        // const daoReceipt = await (await daoFactory.newDAO(rootAddress)).wait();
        // const daoAddress = await getEventArgument(
        //     daoFactory,
        //     daoReceipt.transactionHash,
        //     "DeployDAO",
        //     "dao"
        // );

        // const kernel = await ethers.getContractAt(
        //     "Kernel",
        //     daoAddress,
        //     admin
        // )
        // const APP_MANAGER_ROLE = await kernel.APP_MANAGER_ROLE();
        // const acl = await ethers.getContractAt("ACL", await kernel.acl())

        // // Grant the admin account permission to install apps in the DAO
        // await acl.createPermission(
        //     rootAddress,
        //     kernel.address,
        //     APP_MANAGER_ROLE,
        //     rootAddress
        // );



        // // [dao, acl] = await newDao(admin);
        // votingBase = await Voting.deploy()

        // const appId = ethers.constants.HashZero

        // const receipt = await kernel["newAppInstance(bytes32,address,bytes,bool)"](
        //     appId,
        //     votingBase.address,
        //     "0x",
        //     false
        // );
        // const votingAddress = await getEventArgument(
        //     kernel,
        //     receipt.hash,
        //     "NewAppProxy",
        //     "proxy"
        // );

        // // const votingAddress = await installNewApp(dao, appId, votingBase.address);
        // const voting = await ethers.getContractAt(
        //     "Voting",
        //     votingAddress,
        //     admin
        // )

        // const ANY_ENTITY = "0x" + "f".repeat(40);
        // const CREATE_VOTES_ROLE = await votingBase.CREATE_VOTES_ROLE();
        // await acl.createPermission(
        //     ANY_ENTITY,
        //     voting.address,
        //     CREATE_VOTES_ROLE,
        //     admin.address
        // );


        // // initialize aragon voting contract 
        // const token = miniMeToken.address                //Address that will be used as governance token
        // const supportRequiredPct = pct16(50)             //Percentage of yeas in casted votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
        // const minAcceptQuorumPct = pct16(20);            //Percentage of yeas in total possible votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
        // const voteTime = "600"                           //Seconds that a vote will be open for token holders to vote (unless enough yeas or nays have been cast to make an early decision)
        // const minBalance = "1"                           //Minumum balance that a token holder should have to create a new vote
        // const minTime = "600"                            //Minimum time between a user's previous vote and creating a new vote
        // const minBalanceLowerLimit = "1"                 //Hardcoded lower limit for _minBalance on initialization
        // const minBalanceUpperLimit = "10"                //Hardcoded upper limit for _minBalance on initialization
        // const minTimeLowerLimit = "300"                  //Hardcoded lower limit for _minTime on initialization
        // const minTimeUpperLimit =  "900"                 //Hardcoded upper limit for _minTime on initialization

        // await voting.initialize(
        //     token,
        //     supportRequiredPct,
        //     minAcceptQuorumPct,
        //     voteTime,
        //     minBalance,
        //     minTime,
        //     minBalanceLowerLimit,
        //     minBalanceUpperLimit,
        //     minTimeLowerLimit,
        //     minTimeUpperLimit
        // );


        // // console.log(`
        // //     "ERC20EYWA": ${eywa.address},
        // //     "VotingEscrow": ${votingEscrow.address},
        // //     "GaugeController": ${gaugeController.address},
        // //     "Minter": ${minter.address},
        // //     "LiquidityGauge": {${gauge}},
        // //     "LiquidityGaugeReward": {},
        // //     "PoolProxy": ${poolProxy.address},
        // //     "Voting": ${voting.address},
        // // `)




        // const increase = async (duration ) => {
        //     if (!ethers.BigNumber.isBigNumber(duration)) {
        //       duration = ethers.BigNumber.from(duration);
        //     }
        //     // Get rid of typescript errors
          
        //     if (duration.isNegative())
        //       throw Error(`Cannot increase time by a negative amount (${duration})`);
          
        //     await hre.network.provider.request({
        //       method: "evm_increaseTime",
        //       params: [duration.toNumber()],
        //     });
          
        //     await hre.network.provider.request({
        //       method: "evm_mine",
        //     });
        //   };


        // // ======TEST========
        // // deploy test target
        // const ExecutionTarget = await ethers.getContractFactory("ExecutionTarget");
        // const executionTarget = await ExecutionTarget.deploy()

        // const voteCreatorVoting = voting.connect(admin);
        // const voterVoting = voting.connect(admin);

        // const action = {
        //     to: executionTarget.address,
        //     data: executionTarget.interface.encodeFunctionData("execute"),
        // };

        // const CALLSCRIPT_ID = "0x00000001";
        // function encodeCallScript(actions) {
        //     var to = actions.to;
        //     var data = actions.data;
        //     var address = defaultAbiCoder.encode(["address"], [to]);
        //     var dataLength = defaultAbiCoder.encode(["uint256"], [(data.length - 2) / 2]);
        //     return CALLSCRIPT_ID + address.slice(26) + dataLength.slice(58) + data.slice(2);
        // }

        // // Create a first vote to run following tests with a non-zero voteId
        // await voteCreatorVoting["newVote(bytes,string)"](
        //     encodeCallScript(action),
        //     "TEST"
        // );

        // await increase(voteTime.toString());


        // const voteTx = await voteCreatorVoting["newVote(bytes,string)"](
        //     encodeCallScript(action),
        //     "TEST"
        // );

        // const voteId = await getEventArgument(
        //     voting,
        //     voteTx.hash,
        //     "StartVote",
        //     "voteId"
        // );

        // console.log("Vote ID:", voteId)





        // // make a vote
        // const encodeVoteData = (
        //     voteId,
        //     yeaPct,
        //     nayPct
        // ) => BigNumber.from(yeaPct).shl(64).or(nayPct).shl(128).or(voteId);

        // const yeaPct = votePct(66);
        // const nayPct = votePct(34);
        // const voteData = encodeVoteData(voteId, yeaPct, nayPct);


        // await voterVoting.vote(voteData, false, false);
        

        // // //  Create a new vote about "`_metadata`"
        // // const _executionScript = "0x0"       //EVM script to be executed on approval
        // // const _metadata = "TEST"          //Vote metadata
        // // const _castVote = false           //Whether to also cast newly created vote
        // // const _executesIfDecided = false  //Whether to also immediately execute newly created vote if decided

        // // const voteId = await voting.newVote(
        // //     _executionScript,
        // //     _metadata,
        // //     _castVote,
        // //     _executesIfDecided
        // // )
        // // console.log(voteId)
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