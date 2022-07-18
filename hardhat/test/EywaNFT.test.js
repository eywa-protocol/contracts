const {expect} = require('chai');
const {ethers} = require('hardhat');
const {MerkleTree} = require('merkletreejs');

const increaseTime = async (duration) => {
    if (!ethers.BigNumber.isBigNumber(duration)) {
        duration = ethers.BigNumber.from(duration);
    }

    if (duration.isNegative()) throw Error(`Cannot increase time by a negative amount (${duration})`);

    await hre.network.provider.request({
        method: "evm_increaseTime", params: [duration.toNumber()],
    });

    await hre.network.provider.request({
        method: "evm_mine",
    });
};

const takeSnapshot = async () => {
    return await hre.network.provider.request({
        method: "evm_snapshot", params: [],
    });
};


const restoreSnapshot = async (id) => {
    await hre.network.provider.request({
        method: "evm_revert", params: [id],
    });
};

const getAddrPacked = (addr) => ethers.utils.solidityPack(['address', 'uint256'], [addr.address, addr.amount]);


describe('NFT tests', () => {
    let snapshot0;
    let blockNumBefore;
    let blockBefore;
    let timestampBefore;

    let tokenErc20;
    let vesting;
    let adminDeployer;
    let addr1;
    let addr2;
    let addr3;
    let addrs;
    let day_in_seconds = 86400;
    let merkleAddresses = [];
    let startTimeStamp;
    let cliffDuration;
    let stepDuration;
    let cliffAmount;
    let stepAmount;
    let allStepsDuration;
    let numOfSteps;

    let permissionlessTimeStamp;
    let vestingSupply;

    let claimAllowanceContract = "0x0000000000000000000000000000000000000000";
    let claimWithAllowanceTimeStamp = 0;

    let EYWANFT, EYWANFTContract;
    let totalScore;
    const shift = 100000;


    before(async () => {
        [adminDeployer, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

        const ERC20 = await ethers.getContractFactory('PermitERC20');
        tokenErc20 = await ERC20
            .deploy("PermitERC20 token", "prmt20t");
        await tokenErc20.deployed();


        // Polygon mumbai values
        vestingSupply = 10000000;

        merkleAddresses.push({
            address: addr1.address, amount: 500
        });

        merkleAddresses.push({
            address: addr2.address, amount: 2500
        });

        merkleAddresses.push({
            address: addr3.address, amount: 3500
        });

        totalScore = merkleAddresses.reduce((a, x) => a + x.amount, 0);

        EYWANFTContract = await ethers.getContractFactory('EywaNFT');
        EYWANFT = await EYWANFTContract
            .connect(adminDeployer)
            .deploy(
                "EYWANFT",
                "EYWANFT",
                vestingSupply,
                totalScore
            );
        await EYWANFT.deployed();


        const Vesting = await ethers.getContractFactory('EywaVesting');
        vesting = await Vesting
            .connect(adminDeployer)
            .deploy(tokenErc20.address);
        await vesting.deployed();

        await tokenErc20.mint(adminDeployer.address, vestingSupply, {from: adminDeployer.address});
        expect(await tokenErc20.balanceOf(adminDeployer.address, {from: adminDeployer.address})).to.equal(vestingSupply);
        await tokenErc20.approve(vesting.address, vestingSupply, {from: adminDeployer.address});
        expect(await tokenErc20.allowance(adminDeployer.address, vesting.address, {from: adminDeployer.address})).to.equal(vestingSupply);
        let blockNumBefore = await ethers.provider.getBlockNumber();
        let blockBefore = await ethers.provider.getBlock(blockNumBefore);
        let timestampBefore = blockBefore.timestamp;

        startTimeStamp = timestampBefore + day_in_seconds;
        cliffDuration = day_in_seconds * 50;
        stepDuration = day_in_seconds * 10;
        cliffAmount = vestingSupply / 2;
        numOfSteps = 10;
        stepAmount = (vestingSupply / 2) / numOfSteps;
        permissionlessTimeStamp = day_in_seconds * 10;
        allStepsDuration = numOfSteps * stepDuration;

        await vesting.initialize(claimAllowanceContract, claimWithAllowanceTimeStamp, startTimeStamp, cliffDuration, stepDuration, cliffAmount, allStepsDuration, permissionlessTimeStamp, [EYWANFT.address], [vestingSupply], {from: adminDeployer.address});

        expect(await vesting.cliffAmount()).to.equal(cliffAmount);


        await EYWANFT.setBaseURI("test/");
        await EYWANFT.setVestingAddress(vesting.address);
        expect(await EYWANFT.saleActive()).to.equal(false);
        await EYWANFT.setSaleOpen();
        expect(await EYWANFT.saleActive()).to.equal(true);

    });

    beforeEach(async () => {
        snapshot0 = await takeSnapshot();
        blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestampBefore = blockBefore.timestamp;
    });

    afterEach(async () => {
        await restoreSnapshot(snapshot0);
    });

    it('NFT name and symbol', async function () {
        expect(await EYWANFT.name()).to.equal("EYWANFT");
        expect(await EYWANFT.symbol()).to.equal("EYWANFT");
    });


    it('try mint without merkle root', async function () {
        const proof = ethers.utils.formatBytes32String("test");
        await expect(EYWANFT.mint([proof], 1000))
            .to.be
            .revertedWith('Merkle root not set');
    });


    it('try mint with merkle root', async function () {
        const leaves = merkleAddresses.map(x => getAddrPacked(x));
        const merkleTree = new MerkleTree(leaves, ethers.utils.keccak256, {hashLeaves: true, sortPairs: true});
        const root = merkleTree.getHexRoot();
        await EYWANFT.setMerkleRoot(root);

        let addr = merkleAddresses[0];
        let proof = merkleTree.getHexProof(ethers.utils.keccak256(getAddrPacked(addr)));
        let contract = EYWANFT.connect(addr1);

        expect(await contract.totalSupply()).to.equal(0);

        await contract.mint(proof, addr.amount, {from: addr.address});

        expect(await contract.totalSupply()).to.equal(1);
        expect(await contract.ownerOf(1)).to.equal(addr.address);

        await expect(contract.mint(proof, addr.amount, {from: addr.address}))
            .to.be
            .revertedWith('Can be minted only once');


        addr = merkleAddresses[1];
        proof = merkleTree.getHexProof(ethers.utils.keccak256(getAddrPacked(addr)));
        contract = EYWANFT.connect(addr2);
        await contract.mint(proof, addr.amount, {from: addr.address});
        expect(await contract.ownerOf(25083)).to.equal(addr.address);
    });

    it('mint and claim cliff', async function () {
        await increaseTime(day_in_seconds * 51000);

        const leaves = merkleAddresses.map(x => getAddrPacked(x));
        const addr = merkleAddresses[0];
        const merkleTree = new MerkleTree(leaves, ethers.utils.keccak256, {hashLeaves: true, sortPairs: true});
        const root = merkleTree.getHexRoot();
        const proof = merkleTree.getHexProof(ethers.utils.keccak256(getAddrPacked(addr)));
        await EYWANFT.setMerkleRoot(root);
        let contract = EYWANFT.connect(addr1);

        await contract.mint(proof, addr.amount, {from: addr.address});

        expect(await contract.getTokenStatus(1)).to.equal(1);
        expect(await contract.balanceOf(addr.address)).to.equal(1);
        expect(await contract.ownerOf(1)).to.equal(addr.address);
        expect(await vesting.balanceOf(EYWANFT.address)).to.equal(vestingSupply);

        await expect(contract.claimCliff(1, {from: addr.address}))
            .to.be
            .revertedWith('Claiming period not started');

        await EYWANFT.connect(adminDeployer).startClaiming({from: adminDeployer.address});

        await contract.claimCliff(1, {from: addr.address});

        expect(await contract.getTokenStatus(1 + shift)).to.equal(2);
        const contractBalance = Math.round(vestingSupply - vestingSupply * addr.amount / totalScore * 0.1);
        expect(await vesting.balanceOf(EYWANFT.address)).to.equal(contractBalance);
        expect(await contract.balanceOf(addr.address)).to.equal(1);
        expect(await contract.ownerOf(1 + shift)).to.equal(addr.address);

        await expect(contract.activateVesting(1, {from: addr.address}))
            .to.be
            .revertedWith('Vesting period not started');

        await EYWANFT.connect(adminDeployer).startVesting({from: adminDeployer.address});

        await contract.activateVesting(1 + shift, {from: addr.address});

        expect(await contract.getTokenStatus(1 + shift)).to.equal(0);
        expect(await contract.getTokenStatus(1 + shift * 2)).to.equal(3);
        expect(await contract.ownerOf(1 + shift * 2)).to.equal(addr.address);
        expect(await contract.balanceOf(addr.address)).to.equal(1);
        const vestingBalance = Math.floor(vestingSupply * addr.amount / totalScore * 0.9);
        expect(await vesting.balanceOf(addr.address)).to.equal(vestingBalance);

    });


    // it('mint for team', async function () {
    //     await increaseTime(day_in_seconds * 51000);
    //     let contract = EYWANFT.connect(adminDeployer);
    //     await contract.claimTeamNft({from: adminDeployer.address, gasLimit: '100000000000000'});
    //
    // });


});