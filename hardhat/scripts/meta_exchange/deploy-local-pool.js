const fs = require("fs");
const { network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../../helper-hardhat-config.json')

// local pool params
const A = 100                 // amplification coefficient for the pool.
const fee = 4000000           // pool swap fee
const admin_fee = 5000000000
const poolSize = 3


async function main() {
    console.log("\n LOCAL POOL DEPLOYMENT");
    const [deployer] = await ethers.getSigners();
    console.log("Network:", network.name);
    console.log("Network Id:", await web3.eth.net.getId());
    console.log(`Account: ${deployer.address}`);
    const balance = await deployer.getBalance();
    console.log(`Account balance: ${ethers.utils.formatEther(balance.toString())}`);
    console.log("Pool size:", poolSize);
    console.log("Deployment in progress...");

    const ERC20 = await ethers.getContractFactory('SyntERC20');
    const CurveProxy = await ethers.getContractFactory('CurveProxy');
    const LpToken = await ethers.getContractFactory('CurveTokenV5');
    const StableSwap3Pool = await ethers.getContractFactory('StableSwap3Pool');

    const totalSupply = ethers.utils.parseEther("100000000000.0");

    if (network.name == "network2" || network.name == 'mumbai') {

        // let localToken = deployInfo[network.name].localToken
        let localCoins = [];
        let localLp;
        let localPool;

        for (let i = 0; i < poolSize; i++) {
            localCoins[i] = deployInfo[network.name].localToken[i].address;
        }
        // empty the array
        // deployInfo[network.name].localToken = []

        // // creating local tokens 
        // for (let i = 0; i < poolSize; i++) {
        //     localToken[i] = await ERC20.deploy(network.name + "Token" + i, "TK" + i);
        //     await localToken[i].deployed();
        //     await localToken[i].deployTransaction.wait();
        //     localCoins[i] = localToken[i].address;
        //     deployInfo[network.name].localToken.push({ address: localToken[i].address, name: await localToken[i].name(), symbol: await localToken[i].symbol() });
        // }

        // deploy the LP token
        localLp = await LpToken.deploy(network.name + "LpLocal", "LP");
        await localLp.deployed();
        let txLocalLp = await localLp.deployTransaction.wait();

        deployInfo[network.name].localPool.lp = { address: localLp.address, name: await localLp.name(), symbol: await localLp.symbol() }

        // deploy a local pool
        switch (poolSize) {
            case 2:
                localPool = await StableSwap2Pool.deploy(deployer.address, localCoins, localLp.address, A, fee, admin_fee);
                break;
            case 3:
                localPool = await StableSwap3Pool.deploy(deployer.address, localCoins, localLp.address, A, fee, admin_fee);
                break;
            case 4:
                localPool = await StableSwap4Pool.deploy(deployer.address, localCoins, localLp.address, A, fee, admin_fee);
                break;
            case 5:
                localPool = await StableSwap5Pool.deploy(deployer.address, localCoins, localLp.address, A, fee, admin_fee);
                break;
            case 6:
                localPool = await StableSwap6Pool.deploy(deployer.address, localCoins, localLp.address, A, fee, admin_fee);
                break;
        }
        await localPool.deployed();
        let txLp = await localLp.set_minter(localPool.address);
        await txLp.wait();

        // setting the pool in proxy contract 
        let curveProxyInstance = await CurveProxy.attach(deployInfo[network.name].curveProxy);
        let txSP = await curveProxyInstance.setPool(localPool.address, localLp.address, localCoins);
        await txSP.wait();

        deployInfo[network.name].localPool.address = localPool.address
        deployInfo[network.name].localPool.coins = localCoins

        // add liquidity
        let erc20Instance;
        let txMint;
        for (let i = 0; i < deployInfo[network.name].localPool.coins.length; i++) {
            erc20Instance = await ERC20.attach(deployInfo[network.name].localToken[i].address);
            txMint = await erc20Instance.mint(deployer.address, totalSupply);
            await txMint.wait();
            await (await ERC20.attach(deployInfo[network.name].localToken[i].address).approve(deployInfo[network.name].localPool.address, totalSupply)).wait();
        }
        
        const amounts = new Array(3).fill(ethers.utils.parseEther("100000000.0"));
        let min_mint_amount = 0;

        this.tx = await localPool.add_liquidity(
          amounts,
          min_mint_amount,
          {
            gasLimit: '5000000'
          }
        );
        console.log("add_liquidity to local pool:", this.tx.hash);

        // write out the deploy configuration 
        fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./helper-hardhat-config.json",
            JSON.stringify(deployInfo, undefined, 2));
        console.log("Local Pool Deployed!\n");
    }

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
