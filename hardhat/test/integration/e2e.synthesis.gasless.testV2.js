let argv = null;
if(process.env.TYPE_TEST === 'local') argv = {'typenet': 'devstand', 'net1': 'network1','net2': 'network2'};
if(process.env.TYPE_TEST === 'testnet') argv = {'typenet': 'teststand', 'net1': 'rinkeby','net2': 'bsctestnet'};

require('dotenv').config();
const Web3 = require('web3');
const { checkoutProvider, timeout, makeGsnProvider, specialQuikHackProvider } = require('../../utils/helper');
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');

const tokenPaymaster1 = artifacts.require('TokenPaymasterPermitPaymaster');
const tokenPaymaster2 = artifacts.require('TokenPaymasterPermitPaymaster');

const portal1    = artifacts.require('Portal');
const portal2    = artifacts.require('Portal');

const synthesis1  = artifacts.require('Synthesis');
const synthesis2  = artifacts.require('Synthesis');

const bridge1    = artifacts.require('Bridge');
const bridge2    = artifacts.require('Bridge');

const testUniswap1 = artifacts.require('IUniswap');
const testUniswap2 = artifacts.require('IPancakeRouter02');

const testToken1  = artifacts.require('TestToken');
const testToken2  = artifacts.require('TestToken');

const relayHub1  = artifacts.require('RelayHub');
const relayHub2  = artifacts.require('RelayHub');

const factoryProvider =  checkoutProvider(argv);

let envNet1 = require('dotenv').config({ path: `./env_connect_to_network1.env` });
let envNet2 = require('dotenv').config({ path: `./env_connect_to_network2.env` });

contract('Simple e2e test', (deployer, accounts) => {

    before(async () => {
        relayHub1.setProvider(factoryProvider.web3Net1);
        relayHub2.setProvider(factoryProvider.web3Net2);
        portal1.setProvider(factoryProvider.web3Net1);
        portal2.setProvider(factoryProvider.web3Net2);
        synthesis1.setProvider(factoryProvider.web3Net1);
        synthesis2.setProvider(factoryProvider.web3Net2);
        bridge1.setProvider(factoryProvider.web3Net1);
        bridge2.setProvider(factoryProvider.web3Net2);
        testToken1.setProvider(factoryProvider.web3Net1);
        testToken2.setProvider(factoryProvider.web3Net2);
        testUniswap1.setProvider(factoryProvider.web3Net1);
        testUniswap2.setProvider(factoryProvider.web3Net2);
        tokenPaymaster1.setProvider(factoryProvider.web3Net1);
        tokenPaymaster2.setProvider(factoryProvider.web3Net2);

        this.p1 = await portal1.at(envNet1.parsed.PORTAL_NETWORK1);
        this.p2 = await portal2.at(envNet2.parsed.PORTAL_NETWORK2);
        this.s1 = await synthesis1.at(envNet1.parsed.SYNTHESIS_NETWORK1);
        this.s2 = await synthesis2.at(envNet2.parsed.SYNTHESIS_NETWORK2);
        this.b1 = await bridge1.at(envNet1.parsed.BRIDGE_NETWORK1);
        this.b2 = await bridge2.at(envNet2.parsed.BRIDGE_NETWORK2);

        /** get users in each network  */
        this.owner1 = (await portal1.web3.eth.getAccounts())[0];
        this.owner2 = (await portal2.web3.eth.getAccounts())[0];

        /** that's who can invoke bridge */
        await this.b1.updateDexBind(this.p1.address, true, {from: this.owner1});
        await this.b1.updateDexBind(this.s1.address, true, {from: this.owner1});
        await this.b2.updateDexBind(this.p2.address, true, {from: this.owner2});
        await this.b2.updateDexBind(this.s2.address, true, {from: this.owner2});

        // UniswapV2Router02
        this.uni1    = await testUniswap1.at('0x7a250d5630b4cf539739df2c5dacb4c659f2488d');
        // Pancake
        this.uni2    = await testUniswap2.at('0x9ac64cc6e4415144c455bd8e4837fea55603e5c3');
        // for test in first network (for successful scenario token should be in uniswap pool)
        this.token1  = await testToken1.at('0xe5ff136a8cf502ecf8130ab514f980e1ca2304e0');
        this.token2  = await testToken1.at('0x10e3794c0d610214b727567a5deafdc07fd16f8b');
        // for test in second network  (for successful scenario token should be in pancake pool)
        this.token3  = await testToken2.at('0x1bBB6FC8e87A3622Fbd5300f13bf21A3e66cdB7d');
        this.token4  = await testToken2.at('0x74142B3bE036AF872deF48A00482c5BeC90386bF');

        await this.s2.createRepresentation(this.token1.address, "sToruk Makto", "sTM", {from: this.owner2});
        await this.s2.createRepresentation(this.token2.address, "sNaavi", "sNV", {from: this.owner2});
        await this.s1.createRepresentation(this.token3.address, "sPandora", "sPAR", {from: this.owner1});
        await this.s1.createRepresentation(this.token4.address, "sTsakheila", "sTSL", {from: this.owner1});

        this.rh1        = await relayHub1.at('0x6650d69225CA31049DB7Bd210aE4671c0B1ca132');
        this.rh2        = await relayHub2.at('0xAa3E82b4c4093b4bA13Cb5714382C99ADBf750cA');
        this.paymaster1 = await tokenPaymaster1.at('0x2e5757D5A56479863b71BC745E06b7F13a3a6b71');
        this.paymaster2 = await tokenPaymaster2.at('0x8509ab39cdB4442Efe3584f2032Fff2aa6F25BDC');

        await this.rh1.depositFor(this.paymaster1.address, {from: this.owner1, value: 1e18.toString()})
        await this.rh2.depositFor(this.paymaster2.address, {from: this.owner2, value: 1e18.toString()})

        await this.paymaster1.addToken(this.token1.address, this.uni1.address, {from: this.owner1});
        await this.paymaster1.addToken(this.token2.address, this.uni1.address, {from: this.owner1});

        await this.paymaster2.addToken(this.token3.address, this.uni2.address, {from: this.owner2});
        await this.paymaster2.addToken(this.token4.address, this.uni2.address, {from: this.owner2});
    });

    describe('simple end-to-end test', async () => {
        it('Simple. ERC20 without permit (through approve)', async () => {
            let token_amt = await portal1.web3.utils.toWei('100','ether');
            let chainId   = await portal2.web3.eth.net.getId();
            // APPOVE for pay fee through ERC20 token (in this case fee gets from owner1)
            // TODO: calculate amount with fee
            // TODO: if erc20 != permit => swap on permit
            await this.token1.approve(this.paymaster1.address, token_amt, {from: this.owner1});

            // create gsn provider
            let providerWithGSN = await makeGsnProvider(this.paymaster1.address, specialQuikHackProvider('rinkeby'), this.token1.address);
            // add user private key for to do transaction
            await providerWithGSN.addAccount(process.env.PRIVATE_KEY_RINKEBY);
            await portal1.web3.setProvider(providerWithGSN);
            this.p1 = await portal1.at(envNet1.parsed.PORTAL_NETWORK1);
            const _blockNum = await portal2.web3.eth.getBlockNumber();

            let _userBalanceBefore  = await this.token1.balanceOf(this.owner1, {from: this.owner1});
            // transaction through gsn provider
            let tx1 = await this.p1.synthesize(this.token1.address, token_amt, this.owner2, this.s2.address, this.b2.address, chainId, {from: this.owner1, useGSN: true});

            console.log('tx1: ', tx1.tx);
            console.log('gasUsed1: ', tx1.receipt.gasUsed);
            console.log('Wait transaction in second chain... ');
            let _userBalanceAfter    = await this.token1.balanceOf(this.owner1, {from: this.owner1});
            let _userBalanceInPortal = await this.p1.balanceOf(this.owner1, {from: this.owner1});
            await timeout(80_000); // give some time for execute on second blockchain
            let _getAdrSyth = await this.s2.representationSynt(this.token1.address, {from: this.owner2});
            let _sythToken1 = await testToken2.at(_getAdrSyth);
            let _sythTokenInSynthesis = await _sythToken1.balanceOf(this.owner2, {from: this.owner2});

            // get tx created by bridge into opposite bridge
            let getEvent2 = await this.s2.getPastEvents('SynthesizeCompleted', { fromBlock: _blockNum });
            const tx2 = await portal2.web3.eth.getTransactionReceipt(getEvent2[0].transactionHash);
            assert.equal(getEvent2[0].returnValues._amount, token_amt);
            assert.equal(getEvent2[0].returnValues._token, this.token1.address);
            assert.equal(getEvent2[0].returnValues._to, this.owner2);

            // emit SynthesizeCompleted(_txID, _to, _amount, _tokenReal);
            console.log('tx2: ', tx2.transactionHash);
            console.log('gasUsed2: ', tx2.cumulativeGasUsed);
            console.log('User pay fee in token: ',(_userBalanceBefore.sub(_userBalanceAfter)).sub(web3.utils.toBN(token_amt))/1e18.toString());
            // Balances could be different because bridge sometimes hang up.
            console.log('User balance before synthesis: ',_userBalanceBefore/1e18.toString());
            console.log('User balance after synthesis: ', _userBalanceAfter/1e18.toString());
            console.log('User balance on Synthesis.sol: ',_sythTokenInSynthesis/1e18.toString());
            console.log('Total gasUsed (front + brindge): ', tx1.receipt.gasUsed + tx2.cumulativeGasUsed);
        });
    });
});