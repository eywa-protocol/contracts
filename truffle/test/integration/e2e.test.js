const argv = require('minimist')(process.argv.slice(3), {string: ['typenet','net1', 'net2', 'net3']});
const Web3 = require('web3');
const { checkoutProvider, timeout } = require('../../utils/helper');
const { expectRevert } = require('@openzeppelin/test-helpers');

const mockPool1    = artifacts.require('MockDexPool');
const mockPool2    = artifacts.require('MockDexPool');
const mockPool3    = artifacts.require('MockDexPool');



const brigdePart1  = artifacts.require('Bridge');
const brigdePart2  = artifacts.require('Bridge');
const brigdePart3  = artifacts.require('Bridge');



const factoryProvider =  checkoutProvider(argv);

let envNet1 = require('dotenv').config({ path: `./env_connect_to_network1.env` });
let envNet2 = require('dotenv').config({ path: `./env_connect_to_network2.env` });
let envNet3 = require('dotenv').config({ path: `./env_connect_to_network3.env` });

const { expectEvent } = require('@openzeppelin/test-helpers');

// todo gas consumtion
contract('Brigde', (deployer, accounts) => {


  before(async () => {

    brigdePart1.setProvider(factoryProvider.web3Net1);
    brigdePart2.setProvider(factoryProvider.web3Net2);
    brigdePart3.setProvider(factoryProvider.web3Net3);

    let adr1 = envNet1.parsed.BRIDGE_NETWORK1;
    let adr2 = envNet2.parsed.BRIDGE_NETWORK2;
    let adr3 = envNet3.parsed.BRIDGE_NETWORK3;

    this.br1 = await brigdePart1.at(adr1);
    this.br2 = await brigdePart2.at(adr2);
    this.br3 = await brigdePart3.at(adr3);

    /** users */
    this.userNet1 = (await brigdePart1.web3.eth.getAccounts())[0];
    this.userNet2 = (await brigdePart2.web3.eth.getAccounts())[0];
    this.userNet3 = (await brigdePart3.web3.eth.getAccounts())[0];

    /** mock dexpool in one evm based blockchain and in another evm blockchain */
    mockPool1.setProvider(factoryProvider.web3Net1);
    mockPool2.setProvider(factoryProvider.web3Net2);
    mockPool3.setProvider(factoryProvider.web3Net3);

    this.mp1 = null;
    this.mp2 = null;
    this.mp3 = null;
    if (argv.typenet === 'devstand' 
      && envNet1.parsed.DEXPOOL_NETWORK1 == undefined 
      && envNet2.parsed.DEXPOOL_NETWORK2 == undefined 
      && envNet3.parsed.DEXPOOL_NETWORK3 == undefined) {

      this.mp1 = await mockPool1.new(this.br1.address, {from: this.userNet1});
      this.mp2 = await mockPool2.new(this.br2.address, {from: this.userNet2});
      this.mp3 = await mockPool3.new(this.br3.address, {from: this.userNet3});

      await this.br1.updateDexBind(this.mp1.address, true, {from: this.userNet1});
      await this.br2.updateDexBind(this.mp2.address, true, {from: this.userNet2});
      await this.br3.updateDexBind(this.mp3.address, true, {from: this.userNet3});
      
    } else {
      this.mp1 = await mockPool1.at(envNet1.parsed.DEXPOOL_NETWORK1, {from: this.userNet1});
      this.mp2 = await mockPool2.at(envNet2.parsed.DEXPOOL_NETWORK2, {from: this.userNet2});
      this.mp3 = await mockPool3.at(envNet3.parsed.DEXPOOL_NETWORK3, {from: this.userNet3});
    }

  });


  describe('simple end-to-end test', async () => {


    it('From network 1 to 2 without callback', async () => {

      let res = (await this.mp2.testData({from: this.userNet2})).toString();

      let testData = Math.floor((Math.random() * 100) + 1);
      /** send end-to-end request */
      let receipt = await this.mp1.sendRequestTestV2(testData, this.mp2.address, this.br2.address, 1112, {from: this.userNet1});
      console.log(receipt);
      // console.log(receipt);
      await timeout(15000); // give 15 sec for execute on sencond blockchain
      res = (await this.mp2.testData({from: this.userNet2})).toString();

      assert.equal(res, testData, `Should be ${testData}`);

    });

    it('From network 2 to 1 without callback', async () => {

      let res = (await this.mp1.testData({from: this.userNet1})).toString();

      let testData = Math.floor((Math.random() * 100) + 1);
      /** send end-to-end request */
      let receipt = await this.mp2.sendRequestTestV2(testData, this.mp1.address, this.br1.address, 1111, {from: this.userNet2});
      // console.log(receipt);
      await timeout(15000); // give 50 sec for execute on sencond blockchain
      res = (await this.mp1.testData({from: this.userNet1})).toString();

      assert.equal(res, testData, `Should be ${testData}`);

    });

    it('From network 3 to 2 without callback', async () => {

      let res = (await this.mp2.testData({from: this.userNet2})).toString();

      let testData = Math.floor((Math.random() * 100) + 1);
      /** send end-to-end request */
      let receipt = await this.mp3.sendRequestTestV2(testData, this.mp2.address, this.br2.address, 1112, {from: this.userNet3});
      // console.log(receipt);
      await timeout(15000); // give 50 sec for execute on sencond blockchain
      res = (await this.mp2.testData({from: this.userNet2})).toString();

      assert.equal(res, testData, `Should be ${testData}`);

    });

    it('Negative test: From network 1 to 2. Untrusted dex on bridge1', async () => {

      this.mp1 = await mockPool1.new(this.br1.address, {from: this.userNet1});
      let res = (await this.mp2.testData({from: this.userNet2})).toString();

      let testData = Math.floor((Math.random() * 100) + 1);
      /** send end-to-end request */
      await expectRevert(
        this.mp1.sendRequestTestV2(testData, this.mp2.address, this.br2.address, 1112, {from: this.userNet1}),
        'UNTRUSTED DEX'
      );

    });

  });
})

