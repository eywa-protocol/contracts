//  npx hardhat run --network rinkeby scripts/05
const hre = require("hardhat");
const network = hre.network.name;

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log('Send transactions with the account:', deployer.address);
    console.log('Account balance:', (await deployer.getBalance()).toString());

    let pool = process.env.ADD_LIQUIDITY_POOL_ADDRESS;

    const ERC20Token = await hre.ethers.getContractFactory('SyntERC20');
    const liquidityToken1 = await ERC20Token.attach(process.env.ADD_LIQUIDITY_TOKEN_ADDRESS_1);
    console.log('Liquidity token #1 address:', liquidityToken1.address);

    const liquidityToken2 = await ERC20Token.attach(process.env.ADD_LIQUIDITY_TOKEN_ADDRESS_2);
    console.log('Liquidity token #2 address:', liquidityToken2.address);

    //@todo getAmounts
    let amount1 = process.env.ADD_LIQUIDITY_TOKEN_AMOUNT_1;
    let amount2 = process.env.ADD_LIQUIDITY_TOKEN_AMOUNT_2;

    let tx = await liquidityToken1.approve(pool, amount1);
    await tx.wait();
    console.log('Approved liquidity token #1 to pool: ', tx.hash);

    tx = await liquidityToken2.approve(pool, amount2);
    await tx.wait();
    console.log('Approved liquidity token #2 to pool: ', tx.hash);

    const UniV2Router = await hre.ethers.getContractFactory('UniV2Router');
    let routerAddress = process.env.ADD_LIQUIDITY_ROUTER;
    const router = await UniV2Router.attach(routerAddress);

    console.log('Router address', router.address);

    tx = await router.addLiquidity(
        process.env.ADD_LIQUIDITY_TOKEN_ADDRESS_1,
        process.env.ADD_LIQUIDITY_TOKEN_ADDRESS_2,
        amount1,
        amount2,
        1,
        1,
        deployer.address,
        process.env.ADD_LIQUIDITY_DEADLINE_TIMESTAMP,
        { gasLimit: 1000000 }
    );

    await tx.wait();
    console.log('Add liquidity to pool: ', tx.hash);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
