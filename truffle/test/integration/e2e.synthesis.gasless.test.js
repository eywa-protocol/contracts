const argv = require('minimist')(process.argv.slice(3), {string: ['typenet','net1', 'net2']});
const Web3 = require('web3');
const { checkoutProvider, timeout } = require('../../utils/helper');
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');

const portal1    = artifacts.require('Portal');
const portal2    = artifacts.require('Portal');

const synthesis1  = artifacts.require('Synthesis');
const synthesis2  = artifacts.require('Synthesis');

const bridge1    = artifacts.require('Bridge');
const bridge2    = artifacts.require('Bridge');

const testUniswap1 = artifacts.require('TestUniswap');
const testUniswap2 = artifacts.require('TestUniswap');

const testToken1  = artifacts.require('TestToken');
const testToken2  = artifacts.require('TestToken');




const factoryProvider =  checkoutProvider(argv);

let envNet1 = require('dotenv').config({ path: `./env_connect_to_network1.env` });
let envNet2 = require('dotenv').config({ path: `./env_connect_to_network2.env` });


contract('Simple e2e test', (deployer, accounts) => {


  before(async () => {

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
    // await this.b1.updateDexBind(this.p1.address, true, {from: this.owner1});
    // await this.b1.updateDexBind(this.s1.address, true, {from: this.owner1});
    // await this.b2.updateDexBind(this.p2.address, true, {from: this.owner2});
    // await this.b2.updateDexBind(this.s2.address, true, {from: this.owner2});

    // create mock uniswap
    //this.uni1 = await testUniswap1.new(2, 1, '0x0000000000000000000000000000000000000000', { value: await portal1.web3.utils.toWei('0.000000000000002','ether'), from: this.owner1 });
    this.uni1 = await testUniswap1.at('0xc69bAa9A9A2e6893310ac5fb006FcE40534797fA');
    //this.uni2 = await testUniswap2.new(2, 1, '0x0000000000000000000000000000000000000000', { value: await portal1.web3.utils.toWei('0.000000000000002','ether'),  from: this.owner2 });
    this.uni2 = await testUniswap2.at('0x868D9f94DD7Da99DB440cc789dDe6A27Bb0a1c65');

   // filling it
   //this.tT1 = await testToken1.new('Token1','TK1', {from: this.owner1});
   this.tT1 = await testToken1.at('0xebae90275638c7e026e826dc7616d3b7611923a2');
              //await this.uni1.pu(this.tT1.address, {from: this.owner1});
   //this.tT2 = await testToken2.new('Token2','TK2', {from: this.owner2});
   this.tT2 = await testToken2.at('0xe665A8b193f03aAC1Ce84656865ABD36B723Bd68');
              //await this.uni2.pu(this.tT2.address, {from: this.owner2});
    //
    // await this.s2.createRepresentation(this.tT1.address, "sToken1", "sTK1", {from: this.owner2});
    // await this.s1.createRepresentation(this.tT2.address, "sToken2", "sTK2", {from: this.owner1});



  });


  describe('simple end-to-end test', async () => {

  it('Simple. Without gasless', async () => {
		let token_amt = await portal1.web3.utils.toWei('1.2','ether');
		let chainID   = await portal2.web3.eth.net.getId();
		console.log(this.tT1.address, token_amt, this.owner2, this.s2.address, this.b2.address, chainID);
                    await this.tT1.approve(this.p1.address, token_amt, {from: this.owner1});
		let tx1       = await this.p1.synthesize(this.tT1.address, token_amt, this.owner2, this.s2.address, this.b2.address, chainID, {from: this.owner1})


            // get balance  this.owner2 (address) 0x2b448e4dfe9573439bd27865486f72863dcf3a9a
       });


    });
  });
