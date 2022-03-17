const fs = require("fs");
const { network } = require("hardhat");
let deployInfo = require('../../helper-hardhat-config.json')

async function main() {
    console.log("\n DAO contracts  deployment");
    const [owner, user] = await ethers.getSigners();
    console.log("Network:", network.name);
    console.log("Network Id:", await web3.eth.net.getId());
    console.log(`Deploying with the account: ${owner.address}`);
    const balance = await owner.getBalance();
    console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);
    console.log("Deployment in progress...");

    const TestToken = await ethers.getContractFactory('TestToken')
    const LiquidityGauge = await ethers.getContractFactory('LiquidityGauge')
    const VotingEscrow = await ethers.getContractFactory('VotingEscrow')
    const GaugeController = await ethers.getContractFactory('GaugeController')
    const GaugeProxy = await ethers.getContractFactory('GaugeProxy')
    const Minter = await ethers.getContractFactory('Minter')
    const ERC20CRV = await ethers.getContractFactory('ERC20CRV')

    const increaseTime = async (duration) => {
        if (!ethers.BigNumber.isBigNumber(duration)) {
            duration = ethers.BigNumber.from(duration);
        }

        if (duration.isNegative())
            throw Error(`Cannot increase time by a negative amount (${duration})`);

        await hre.network.provider.request({
            method: "evm_increaseTime",
            params: [duration.toNumber()],
        });

        await hre.network.provider.request({
            method: "evm_mine",
        });
    };
    // if (network.name == "network2" || network.name == "mumbai") {
    // deploy eywa `ERC20CRV`
    // const name = "Vote-escrowed EYWA"
    // const symbol = "veEYWA"
    // const decimals = 18
    // const version = "0.0.1"

    const eywa = await ERC20CRV.deploy("EYWA-TOKEN", "EYWA", 18)
    await eywa.deployed()

    const votingEscrow = await VotingEscrow.deploy(eywa.address, "Vote-escrowed EYWA", "xEYWA", "0.0.1")
    await votingEscrow.deployed()


    // @param _token `ERC20CRV` contract address
    // @param _voting_escrow `VotingEscrow` contract address
    const gaugeController = await GaugeController.deploy(eywa.address, votingEscrow.address)
    await gaugeController.deployed()
    await gaugeController.add_type("Liquidity", "1000000000000000000" /* 10**18 */, { gasLimit: 1000000 }) //new web3.utils.BN(10).pow(new web3.utils.BN(18)

    // deploy minter 
    // @param token: address, 
    // @param controller: address
    const minter = await Minter.deploy(eywa.address, gaugeController.address)
    await minter.deployed()
    await eywa.set_minter(minter.address)

    console.log( ethers.utils.formatEther(await eywa.totalSupply()))

    let lpToken = await TestToken.deploy("TestToken", "TT")
    let lpToken1 = await TestToken.deploy("TestToken", "TT")
    // @param admin: address
    let gauge = await LiquidityGauge.deploy(lpToken.address, minter.address, owner.address)
    await gauge.deployed()
    let gauge1 = await LiquidityGauge.deploy(lpToken1.address, minter.address, owner.address)
    await gauge1.deployed()

    await gaugeController.add_gauge(gauge.address, 0, "10000000000000000000"/*weight*/, { gasLimit: 1000000 })
    await gaugeController.add_gauge(gauge1.address, 0, "10000000000000000000"/*weight*/, { gasLimit: 1000000 })


    await lpToken.approve(gauge.address, ethers.utils.parseEther("100.0"))
    await gauge.deposit(ethers.utils.parseEther("1.0"), owner.address)
    await lpToken1.approve(gauge1.address, ethers.utils.parseEther("100.0"))
    await gauge1.deposit(ethers.utils.parseEther("1.0"), owner.address)


    await increaseTime(604800)
    console.log(parseInt(await gauge.claimable_tokens(owner.address)))
    console.log(parseInt(await gauge1.claimable_tokens(owner.address)))

    await minter.mint(gauge.address)
    await minter.mint(gauge1.address)
    console.log(parseInt(await eywa.balanceOf(owner.address)))
    // }


}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });