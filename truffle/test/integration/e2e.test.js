const axios = require('axios');
const argv = require('minimist')(process.argv.slice(2), {string: ['typenet','net1', 'net2']});
const Web3 = require('web3');
const { checkoutProvider, timeout, adapters, checkBlock, getCostFromScan } = require('../../utils/helper');

const mockPool1    = artifacts.require('MockDexPool');
const mockPool2    = artifacts.require('MockDexPool');
const brigdePart1  = artifacts.require('Bridge');
const brigdePart2  = artifacts.require('Bridge');

const factoryProvider =  checkoutProvider(argv);

let envNet1 = require('dotenv').config({ path: `./build/addrs_${argv.net1}.env` });
let envNet2 = require('dotenv').config({ path: `./build/addrs_${argv.net2}.env` });

const { expectEvent } = require('@openzeppelin/test-helpers');

// todo gas consumtion
contract('Brigde', (deployer, accounts) => {

  beforeEach(async () => {

  });


  before(async () => {

    brigdePart1.setProvider(factoryProvider.web3Net1);
    brigdePart2.setProvider(factoryProvider.web3Net2);

    this.br1      = await brigdePart1.at(envNet1.parsed.CLIENT_ADDRESS);
    this.br2      = await brigdePart2.at(envNet2.parsed.CLIENT_ADDRESS);

    /** users */
    this.userNet1 = (await brigdePart1.web3.eth.getAccounts())[0];
    this.userNet2 = (await brigdePart2.web3.eth.getAccounts())[0];
    /** mock dexpool in one evm based blockchain and in another evm blockchain */
    mockPool1.setProvider(factoryProvider.web3Net1);
    mockPool2.setProvider(factoryProvider.web3Net2);
    this.mp1 = await mockPool1.new(this.br1.address, {from: this.userNet1});
    this.mp2 = await mockPool2.new(this.br2.address, {from: this.userNet2});

  });


  describe('simple end-to-end test', async () => {

    it('change state from first to second sides', async () => {

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

    it.skip('without callback', async () => {

      let testData = 5;
      /** send end-to-end request */
      let receipt = await this.mp2.sendRequestTestV2(testData, this.mp1.address, {from: this.userNet2});
      
      // wait on the second part the excuted tx
      let reslt = null;
      while(true){
       reslt = ~~(await this.mp1.testData({from: this.userNet1})).toString();
       if(reslt === testData) break;
       await timeout(500);
      }

      assert.equal(reslt.toString(), '5');

      //TODO: check out 0x2431bee4 (bytes4(keccak256(bytes('receiveRequestV2(string,bytes,bytes,bytes32,address)'))))

    });

    it('get state', async () => {

    });

 });

})
