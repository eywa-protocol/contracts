const argv = require('minimist')(process.argv.slice(2), {string: ['typenet','net1', 'net2']});
const Web3 = require('web3');
const { checkoutProvider, timeout } = require('../../utils/helper');

const mockPool1    = artifacts.require('MockDexPool');
const mockPool2    = artifacts.require('MockDexPool');
const brigdePart1  = artifacts.require('Bridge');
const brigdePart2  = artifacts.require('Bridge');

const factoryProvider =  checkoutProvider(argv);

let envNet1 = require('dotenv').config({ path: `./env_connect_to_network1.env` });
let envNet2 = require('dotenv').config({ path: `./env_connect_to_network2.env` });
let envNet3 = require('dotenv').config({ path: `./env_connect_to_network3.env` });

const { expectEvent } = require('@openzeppelin/test-helpers');

// todo gas consumtion
contract('Brigde', (deployer, accounts) => {

  beforeEach(async () => {

  });


  before(async () => {

    brigdePart1.setProvider(factoryProvider.web3Net1);
    brigdePart2.setProvider(factoryProvider.web3Net2);


    let adr1 = envNet1.parsed.BRIDGE_NETWORK1;
    let adr2 = envNet2.parsed.BRIDGE_NETWORK2;
    this.br1      = await brigdePart1.at(adr1);
    this.br2      = await brigdePart2.at(adr2);

    /** users */
    this.userNet1 = (await brigdePart1.web3.eth.getAccounts())[0];
    this.userNet2 = (await brigdePart2.web3.eth.getAccounts())[0];
    /** mock dexpool in one evm based blockchain and in another evm blockchain */
    mockPool1.setProvider(factoryProvider.web3Net1);
    mockPool2.setProvider(factoryProvider.web3Net2);

    this.mp1 = null;
    this.mp2 = null;
    if(argv.typenet === 'devstand' && envNet1.parsed.MOCKDEX_NETWORK1 == undefined && envNet2.parsed.MOCKDEX_NETWORK2 == undefined){
      this.mp1 = await mockPool1.new(this.br1.address, {from: this.userNet1});
      this.mp2 = await mockPool2.new(this.br2.address, {from: this.userNet2});
    }else{
      this.mp1 = await mockPool1.at(envNet1.parsed.MOCKDEX_NETWORK1, {from: this.userNet1});
      this.mp2 = await mockPool2.at(envNet2.parsed.MOCKDEX_NETWORK2, {from: this.userNet2});
    }

  });


  describe('simple end-to-end test', async () => {

    it.skip('change state from first to second sides', async () => {

      let testData = 10;
      /** send end-to-end request */
      let receipt = await this.mp1.sendRequestTest(testData, this.mp2.address, {from: this.userNet1});
      let t = await expectEvent(receipt, 'RequestSended');
      let result = await this.mp1.getPendingRequests(t.args[0], {from: this.userNet1});
      assert.equal(result[1], '0x3078310000000000000000000000000000000000000000000000000000000000', 'tx in pending on other side');

            // if(argv.typenet === 'teststand') await getCostFromScan('rinkeby', receipt.tx);

      // wait on the second part the excuted tx
      while(true){
       let result = ~~(await this.mp2.testData({from: this.userNet2})).toString();
       if(result === testData) break;
       await timeout(500);
      }

            // let tx1 = await checkBlock(brigdePart2.web3, adapters().adapter1_net1_1);
            // if(argv.typenet === 'teststand' && tx1 != null) await getCostFromScan('binance', tx1);

            // let tx2 = await checkBlock(brigdePart2.web3, adapters().adapter2_net1_1);
            // if(argv.typenet === 'teststand' && tx2 != null) await getCostFromScan('binance', tx2);


      while(true){
        let result = await this.mp1.getPendingRequests(t.args[0], {from: this.userNet1});
        if(result[1] !== '0x3078310000000000000000000000000000000000000000000000000000000000') break;
        await timeout(500);
      }

      // checking out result on started pool the result of execute all process
      result = await this.mp1.getPendingRequests(t.args[0], {from: this.userNet1});
      assert.notEqual(result[1], '0x3078310000000000000000000000000000000000000000000000000000000000', 'bridge worked on both sides');

            // let tx3 = await checkBlock(brigdePart1.web3, adapters().adapter1_net2_1);
            // if(argv.typenet === 'teststand') await getCostFromScan('rinkeby', tx3);

            // let tx4 = await checkBlock(brigdePart1.web3, adapters().adapter2_net2_1);
            // if(argv.typenet === 'teststand') await getCostFromScan('rinkeby', tx4);

      /*Fee = Gas_Used * Gas_Price
        = 35531 (unit) * 0.000000008 (eth)
        = 0.000284248 (eth)
       */
    });

    it.skip('change state from second to first sides', async () => {

      let testData = 7;
      /** send end-to-end request */
      let receipt = await this.mp2.sendRequestTest(testData, this.mp1.address, {from: this.userNet2});
      let t = expectEvent(receipt, 'RequestSended');
      let result = await this.mp2.getPendingRequests(t.args[0], {from: this.userNet2});
      assert.equal(result[1], '0x3078310000000000000000000000000000000000000000000000000000000000', 'tx in pending on other side');

      // wait on the second part the excuted tx
      while(true){
       let result = ~~(await this.mp1.testData({from: this.userNet1})).toString();
       if(result === testData) break;
       await timeout(500);
      }

      while(true){
        let result = await this.mp2.getPendingRequests(t.args[0], {from: this.userNet2});
        if(result[1] !== '0x3078310000000000000000000000000000000000000000000000000000000000') break;
        await timeout(500);
      }

      // checking out result on started pool the result of execute all process
      result = await this.mp2.getPendingRequests(t.args[0], {from: this.userNet2});
      assert.notEqual(result[1], '0x3078310000000000000000000000000000000000000000000000000000000000', 'bridge worked on both sides');

    });

    it('From network1 without callback', async () => {

      let res = (await this.mp2.testData({from: this.userNet2})).toString();

      let testData = Math.floor((Math.random()*100) + 1);
      /** send end-to-end request */
      let receipt = await this.mp1.sendRequestTestV2(testData, this.mp2.address, this.br2.address, 1112, {from: this.userNet1});
      // console.log(receipt);
      await timeout(15000); // give 15 sec for execute on sencond blockchain
      res = (await this.mp2.testData({from: this.userNet2})).toString();

      assert.equal(res, testData, `Should be ${testData}`);

    });

    it('From network2 without callback', async () => {

      let res = (await this.mp1.testData({from: this.userNet1})).toString();

      let testData = Math.floor((Math.random()*100) + 1);
      /** send end-to-end request */
      let receipt = await this.mp2.sendRequestTestV2(testData, this.mp1.address, this.br1.address, 1111, {from: this.userNet2});
      // console.log(receipt);
      await timeout(50000); // give 50 sec for execute on sencond blockchain
      res = (await this.mp1.testData({from: this.userNet1})).toString();

      assert.equal(res, testData, `Should be ${testData}`);

    });

    it.skip('get state', async () => {

    });

 });


//TODO:
// - case when msg.sender (node) have't permission for sending into bridge (absent in trustedList)

})
