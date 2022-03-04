const fs = require("fs");
const { network } = require("hardhat");
let deployInfo = require('../../helper-hardhat-config.json')

async function setNetworkTime(timestamp) {
    await network.provider.send("evm_setNextBlockTimestamp", [timestamp])
    await network.provider.send("evm_mine")
  }
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

async function main() {
    console.log("\n DAO contracts  deployment");
    const [user] = await ethers.getSigners();
    console.log("Network:", network.name);
    console.log("Network Id:", await web3.eth.net.getId());
    console.log(`Deploying with the account: ${user.address}`);
    const balance = await user.getBalance();
    console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);
    console.log("Deployment in progress...");

    const LiquidityGauge = await ethers.getContractFactory('LiquidityGauge')
    const VotingEscrow = await ethers.getContractFactory('VotingEscrow')
    const GaugeController = await ethers.getContractFactory('GaugeController')
    const GaugeProxy = await ethers.getContractFactory('GaugeProxy')
    const Minter = await ethers.getContractFactory('Minter')
    const ERC20CRV = await ethers.getContractFactory('ERC20CRV')
    const LpToken = await ethers.getContractFactory('CurveTokenV5')
    
    if (network.name == "network2" || network.name == "mumbai") {
    
        // await increaseTime(2592000)

        
        const eywa = await ERC20CRV.attach(deployInfo[network.name].dao.eywa)
        const gaugeController = await GaugeController.attach(deployInfo[network.name].dao.gaugeController)

        const minter = await Minter.attach(deployInfo[network.name].dao.minter)
        // console.log( await eywa.update_mining_parameters())
        // gauge
        for (let i = 0; i < deployInfo[network.name].crosschainPool.length; i++) {
            
            let lp = LpToken.attach(deployInfo[network.name].crosschainPool[i].lp[0].address)
            let gauge = await LiquidityGauge.attach(deployInfo[network.name].crosschainPool[i].gauge)
            // console.log(await lp.balanceOf(user.address))

            await lp.approve(gauge.address, ethers.utils.parseEther("100.0"))
            await gauge.deposit(ethers.utils.parseEther("1.0"), user.address)
            // await gauge.withdraw(ethers.utils.parseEther("100.0")) 

            console.log(parseInt(await gauge.claimable_tokens(user.address)))
            // //mint

            // await minter.mint(gauge.address)

        }

        //local gauge
      
        let lpForLocal = LpToken.attach(deployInfo[network.name].localPool.lp.address)
        let gaugeLocal = await LiquidityGauge.attach(deployInfo[network.name].localPool.gauge)
        // console.log(await lp.balanceOf(user.address))

        await lpForLocal.approve(gaugeLocal.address, ethers.utils.parseEther("100.0"))
        await gaugeLocal.deposit(ethers.utils.parseEther("1.0"), user.address)
        console.log(parseInt(await gaugeLocal.claimable_tokens(user.address)))



        // await minter.toggle_approve_mint(user.address)
        await increaseTime(604800)
        await minter.mint(gaugeLocal.address)
        // console.log( await eywa.start_epoch_time_write())

        console.log(await eywa.balanceOf(user.address))
    }

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });