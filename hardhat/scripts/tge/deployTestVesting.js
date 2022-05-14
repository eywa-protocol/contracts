const fs = require("fs");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json');
let unlockScheme = require(process.env.HHC_PASS ? process.env.HHC_PASS : './unlockScheme.json');
const { network } = require("hardhat");
const { timeout } = require('../../utils/helper');
const hre = require("hardhat");

async function main() {
    console.log("\n TGE SCHEME DEPLOYMENT");
    const [deployer] = await ethers.getSigners();
    console.log("Network:", network.name);
    console.log("Network Id:", await web3.eth.net.getId());
    console.log(`Account: ${deployer.address}`);
    const balance = await deployer.getBalance();
    console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);
    console.log(Date.now())

    const Vesting = await ethers.getContractFactory('EywaVesting');
    const EYWA = await ethers.getContractFactory('EywaToken');
    const Treasury = await ethers.getContractFactory('EywaTreasury');

    // const eywa = await EYWA.attach(deployInfo[network.name].dao.eywa)
    const eywa = await EYWA.deploy(deployer.address, "1")

    //   let earlyTransferPermissionAdmin;
    const TGE_TIME = Date.now(); // CHANGE!
    const MONTH = 2629743;

    let claimAllowanceContract = "0x0000000000000000000000000000000000000000";


    let testUnlockScheme = [{
        "name": "TEST1 round",
        "tokenAmount": "100000",
        "salePeriod": "1800", // TOTAL: 30 min
        "cliffPeriod": "600", // CLIFF: ON 10 min
        "cliffPercent": "10", // CLIFF %: 10 percent
        "permissionlessTimeStamp": "0",
        "claimWithAllowanceTimeStamp": "0",
        "stepAmount": "1"
    }, {
        "name": "TEST2 round",
        "tokenAmount": "100000",
        "salePeriod": "1800", // TOTAL: 45 min
        "cliffPeriod": "600", // CLIFF: ON 15 min
        "cliffPercent": "10", // CLIFF %: 15 percent
        "permissionlessTimeStamp": "0",
        "claimWithAllowanceTimeStamp": "0",
        "stepAmount": "1"
    }, {
        "name": "TEST3 round",
        "tokenAmount": "100000",
        "salePeriod": "3600", // TOTAL: 60 min
        "cliffPeriod": "1800", // CLIFF: ON 30 min
        "cliffPercent": "10", // CLIFF %: 10 percent
        "permissionlessTimeStamp": "0",
        "claimWithAllowanceTimeStamp": "0",
        "stepAmount": "1"
    }, {
        "name": "TEST4 round",
        "tokenAmount": "100000",
        "salePeriod": "7200", // TOTAL: 120 min
        "cliffPeriod": "1200", // CLIFF: ON 20 min
        "cliffPercent": "15", // CLIFF %: 10 percent
        "permissionlessTimeStamp": "0",
        "claimWithAllowanceTimeStamp": "0",
        "stepAmount": "1"
    }]

    for (let [index, sale] of testUnlockScheme.entries()) {
        let salePeriod = sale.salePeriod;
        let thisRoundSupply = ethers.utils.parseEther(sale.tokenAmount + ".0");
        let startTimeStamp = TGE_TIME;
        let cliffDuration = sale.cliffPeriod;
        let cliffAmount = parseInt(thisRoundSupply * sale.cliffPercent / 100);
        let stepDuration = sale.stepAmount;
        let allStepsDuration = salePeriod - cliffDuration;
        let permissionlessTimeStamp = sale.permissionlessTimeStamp;
        let claimWithAllowanceTimeStamp = sale.claimWithAllowanceTimeStamp;

        // deploy contract
        let vesting = await Vesting.connect(deployer).deploy(eywa.address);
        await vesting.deployed();
        await eywa.connect(deployer).approve(vesting.address, thisRoundSupply);
        await vesting.connect(deployer).initialize(
            claimAllowanceContract,
            claimWithAllowanceTimeStamp,
            startTimeStamp,
            cliffDuration,
            stepDuration,
            cliffAmount,
            allStepsDuration,
            permissionlessTimeStamp,
            [deployer.address],
            [thisRoundSupply],
            { gasLimit: "1000000" }
        );
        // await vesting.deployed(5)
        console.log("Vesting:", vesting.address + "\n");
        testUnlockScheme[index].address = vesting.address

        await timeout(60_000);
        let vestingBalance = await vesting.balanceOf(deployer.address)
        await vesting.transfer("0x2929C55ACdDE4DFBBFAa2Dd9358A07F3B72A6179", vestingBalance, { gasLimit: "1000000" })

        // try {
        //     await hre.run("verify:verify", {
        //         address: vesting.address,
        //         constructorArguments: [eywa.address],
        //         contract: "contracts/amm_pool/Vesting.sol:EywaVesting"
        //     });
        // } catch (e) {
        //     console.log(e);
        // }
    }

    console.log("TEST EYWA Token:", eywa.address)
    console.log(testUnlockScheme)




    // fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./helper-hardhat-config.json",
    //   JSON.stringify(deployInfo, undefined, 2));
    // fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./scripts/tge/unlockScheme.json",
    //   JSON.stringify(unlockScheme, undefined, 2));

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
