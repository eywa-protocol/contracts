const { ethers } = require("hardhat")

let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')

let year = 365 * 24 * 60 * 60
let lockPeriod = year
let minveCRVperiod = year
let selectedGauge = deployInfo["network2"].crosschainPool[0].gauge
// let gaugeBalance = 0
// let poolLiquidity = 0
let entertype = 0
let myCRV = 0
let myveCRV = 0
let totalveCRV = 0
let gaugeController = null
let votingEscrow = deployInfo["network2"].dao.votingEscrow
// let gauge = null
let boost = 1
let minveCRV = null
let maxBoostPossible = null




async function main() {
    const [user] = await ethers.getSigners();
    console.log("Network:", network.name);
    console.log("Network Id:", await web3.eth.net.getId());
    console.log(`Deploying with the account: ${user.address}`);
    const balance = await user.getBalance();
    console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}\n`);

    const TestToken = await ethers.getContractFactory('TestToken')
    const LiquidityGauge = await ethers.getContractFactory('LiquidityGauge')
    const VotingEscrow = await ethers.getContractFactory('VotingEscrow')
    const GaugeController = await ethers.getContractFactory('GaugeController')
    const GaugeProxy = await ethers.getContractFactory('GaugeProxy')
    const Minter = await ethers.getContractFactory('Minter')
    const ERC20CRV = await ethers.getContractFactory('ERC20CRV')

    var timeInMs = Date.now();
    this.gauge = await LiquidityGauge.attach(selectedGauge)
    this.gaugeBalance = (await this.gauge.balanceOf(user.address) / 1e18).toFixed(); console.log("gaugeBalance", this.gaugeBalance)
    this.poolLiquidity = (await this.gauge.totalSupply() / 1e18).toFixed(); console.log("poolLiquidity", this.poolLiquidity)
    this.votingEscrow = await VotingEscrow.attach(votingEscrow)

    let CRV = await ERC20CRV.attach(deployInfo[network.name].dao.eywa)
    this.gaugeController = await GaugeController.attach(deployInfo[network.name].dao.gaugeController)
    this.myCRV = (await CRV.balanceOf(user.address) / 1e18).toFixed(2); console.log("myCRV", this.myCRV)
    this.myveCRV = (await this.votingEscrow.balanceOf(user.address, timeInMs) / 1e18).toFixed(2); console.log("myveCRV", this.myveCRV)
    // this.myveCRV = ethers.utils.parseEther("100000.0") // TEST<<<<<<<
    this.totalveCRV = (await this.votingEscrow.totalSupply(timeInMs) / 1e18).toFixed(2); console.log("totalveCRV", this.totalveCRV)
    this.totalveCRV = ethers.utils.parseEther("100000.0") // TEST<<<<<<<

    function veCRV(lockPeriod) {
        return ((this.myCRV * lockPeriod) / (86400 * 365) / 4).toFixed(2)
    }

    function CRVtoLock() {
        return (this.minveCRV / ((this.minveCRVperiod / year) / 4)).toFixed(2)
    }

    async function calc() {
        let [_, boost] = await update_liquidity_limit()
        return boost
    }

    async function maxBoost() {
        let l = this.gaugeBalance * 1e18
        let L = +this.poolLiquidity * 1e18 + l
        let minveCRV = this.totalveCRV * l / L
        this.minveCRV = minveCRV
        let [_, maxBoostPossible] = await update_liquidity_limit(null, null, this.minveCRV)
        return maxBoostPossible
    }

    async function update_liquidity_limit(new_l = null, new_voting_balance = null, minveCRV = null) {
        let l = this.gaugeBalance * 1e18; console.log("l", l)
        // let calls = [
        //     [this.votingEscrow._address, this.votingEscrow.balanceOf(user.address).encodeABI()],
        //     [this.votingEscrow._address, this.votingEscrow.totalSupply().encodeABI()],
        //     [this.gauge._address, this.gauge.period_timestamp(0).encodeABI()],
        //     [this.gauge._address, this.gauge.working_balances(user.address).encodeABI()],
        //     [this.gauge._address, this.gauge.working_supply().encodeABI()],
        //     [this.gauge._address, this.gauge.totalSupply().encodeABI()],
        // ]
        // let aggcalls = await contract.multicall.aggregate(calls)
        // let decoded = aggcalls[1].map(hex => web3.eth.abi.decodeParameter('uint256', hex))

        let voting_balance = +await this.votingEscrow.balanceOf(user.address, timeInMs); console.log("voting_balance", voting_balance)
        let voting_total = +await this.votingEscrow.totalSupply(timeInMs) - +voting_balance; console.log("voting_total", voting_total)
        let period_timestamp = +await this.gauge.period_timestamp(0); console.log("period_timestamp", period_timestamp)
        let working_balances = +await this.gauge.working_balances(user.address); console.log("working_balances", working_balances)
        let working_supply = +await this.gauge.working_supply()
        let L = +this.poolLiquidity * 1e18 + l
        if (new_voting_balance) {
            voting_balance = new_voting_balance * 1e18
        }
        voting_total += voting_balance
        let TOKENLESS_PRODUCTION = 40
        let lim = l * TOKENLESS_PRODUCTION / 100;
        let veCRV = this.myveCRV;
        if (minveCRV)
            veCRV = minveCRV;
        else if (this.entertype == 0)
            veCRV = this.veCRV;
        lim += L * veCRV / this.totalveCRV * (100 - TOKENLESS_PRODUCTION) / 100; console.log("lim", lim)
        lim = Math.min(l, lim); console.log("lim", lim)

        let old_bal = working_balances; console.log("old_bal", old_bal)
        let noboost_lim = TOKENLESS_PRODUCTION * l / 100; console.log("noboost_lim", noboost_lim)
        let noboost_supply = working_supply + noboost_lim - old_bal; console.log("noboost_supply", noboost_supply)
        let _working_supply = working_supply + lim - old_bal; console.log("_working_supply", _working_supply);
        // let limCalc = (l * TOKENLESS_PRODUCTION / 100 + (this.poolLiquidity + l) * veCRV / this.totalveCRV * (100 - TOKENLESS_PRODUCTION) / 100)
        // boost = limCalc
        // 		/ (working_supply + limCalc - old_bal)
        return [_working_supply, (lim / _working_supply) / (noboost_lim / noboost_supply)]

        // let limCalc = (l * TOKENLESS_PRODUCTION / 100 + (this.poolLiquidity + l) * veCRV / this.totalveCRV * (100 - TOKENLESS_PRODUCTION) / 100);  console.log("limCalc",limCalc);
        //  boost = limCalc / (working_supply + limCalc - old_bal);     console.log("boost",boost);
        // return [_working_supply, boost]
    }


    // let [_, boost] = await update_liquidity_limit(null,  ethers.utils.parseEther("2211100.0"), ethers.utils.parseEther("2211126000.0"))
    // console.log(boost)

    console.log("MAX BOOST:", await maxBoost())
    // console.log("CALC:",await calc())
}


main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });