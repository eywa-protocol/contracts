
let argv = null;
if(process.env.TYPE_TEST === 'local') argv = {'typenet': 'devstand', 'net1': 'network1','net2': 'network2', 'net3': 'network3' };
if(process.env.TYPE_TEST === 'testnet') argv = {'typenet': 'teststand', 'net1': 'rinkeby','net2': 'bsctestnet', 'net3': 'mumbai' };
 //require('minimist')(process.argv.slice(3), {string: ['typenet', 'net1', 'net2', 'net3']});
const Web3 = require('web3');
const {checkoutProvider, timeout, chainId} = require('../../utils/helper');
const {expectRevert} = require('@openzeppelin/test-helpers');

const mockPool1 = artifacts.require('MockDexPool');
const mockPool2 = artifacts.require('MockDexPool');
const mockPool3 = artifacts.require('MockDexPool');


const brigdePart1 = artifacts.require('Bridge');
const brigdePart2 = artifacts.require('Bridge');
const brigdePart3 = artifacts.require('Bridge');


const factoryProvider = checkoutProvider(argv);

let envNet1 = require('dotenv').config({path: `./networks_env/env_test_for_${argv.net1}.env`});
let envNet2 = require('dotenv').config({path: `./networks_env/env_test_for_${argv.net2}.env`});
let envNet3 = require('dotenv').config({path: `./networks_env/env_test_for_${argv.net3}.env`});

// todo gas consumtion
contract('Brigde', (deployer, accounts) => {

    before(async () => {

        brigdePart1.setProvider(factoryProvider.web3Net1);
        brigdePart2.setProvider(factoryProvider.web3Net2);
        brigdePart3.setProvider(factoryProvider.web3Net3);

        let adr1 = eval(`envNet1.parsed.BRIDGE_${argv.net1.toUpperCase()}`);
        let adr2 = eval(`envNet2.parsed.BRIDGE_${argv.net2.toUpperCase()}`);
        let adr3 = eval(`envNet3.parsed.BRIDGE_${argv.net3.toUpperCase()}`);

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

            this.mp1 = await mockPool1.at(eval(`envNet1.parsed.DEXPOOL_${argv.net1.toUpperCase()}`), {from: this.userNet1});
            this.mp2 = await mockPool2.at(eval(`envNet2.parsed.DEXPOOL_${argv.net2.toUpperCase()}`), {from: this.userNet2});
            this.mp3 = await mockPool3.at(eval(`envNet3.parsed.DEXPOOL_${argv.net3.toUpperCase()}`), {from: this.userNet3});

    });


    describe('simple end-to-end test', async () => {


        it('From network 1 to 2 without callback', async () => {

            let res = (await this.mp2.testData({from: this.userNet2})).toString();
            let testData = Math.floor((Math.random() * 100) + 1);
            /** send end-to-end request */
            let receipt = await this.mp1.sendRequestTestV2(testData, this.mp2.address, this.br2.address, chainId(argv.net2), {from: this.userNet1, gasPrice: 20000000000, gas: 300_000 });
	        //console.log(receipt);
            await timeout(25000); // give some time
            res = (await this.mp2.testData({from: this.userNet2})).toString();

            assert.equal(res, testData, `Should be ${testData}`);

        });

        it('From network 2 to 1 without callback', async () => {

            let res = (await this.mp1.testData({from: this.userNet1})).toString();

            let testData = Math.floor((Math.random() * 100) + 1);
            /** send end-to-end request */
            let receipt = await this.mp2.sendRequestTestV2(testData, this.mp1.address, this.br1.address, chainId(argv.net1), {from: this.userNet2, gasPrice: 20000000000, gas: 300_000 });
            //console.log(receipt);
            await timeout(30000); // give some time
            res = (await this.mp1.testData({from: this.userNet1})).toString();

            assert.equal(res, testData, `Should be ${testData}`);

        });

        it('From network 3 to 2 without callback', async () => {

            let res = (await this.mp2.testData({from: this.userNet2})).toString();

            let testData = Math.floor((Math.random() * 100) + 1);
            /** send end-to-end request */
            let receipt = await this.mp3.sendRequestTestV2(testData, this.mp2.address, this.br2.address, chainId(argv.net2), {from: this.userNet3, gasPrice: 20000000000, gas: 300_000 });
            //console.log(receipt);
            await timeout(25000); // give some time
            res = (await this.mp2.testData({from: this.userNet2})).toString();

            assert.equal(res, testData, `Should be ${testData}`);

        });

        it('Negative test: From network 3 to 1. \'TO\' ALREADY EXIST', async () => {
            let from           = await mockPool3.new(this.br3.address, {from: this.userNet3, gasPrice: 20000000000, gas: 500_000});
            let oppositeBridge = this.br1.address;
            let to             = this.mp1.address;
         try{
             let tx =  await this.br3.addContractBind(from.address, oppositeBridge, to, {from: this.userNet3, gasPrice: 20000000000, gas: 200_000 });
            }catch(e){
                // unusual process for reason: hardhat + HDWalletProvider
                //console.log(e.message);
                assert.equal(e.receipt?.status === false ? undefined : e.receipt?.status, undefined, `Should be false by TO ALREADY EXIST`);
                
            }
        });

        it('Negative test: From network 1 to 2. Untrusted dex on bridge1', async () => {

            this.mp1 = await mockPool1.new(this.br1.address, {from: this.userNet1, gasPrice: 20000000000, gas: 500_000});
            let res = (await this.mp2.testData({from: this.userNet2})).toString();
           
            let testData = Math.floor((Math.random() * 100) + 1);
           try{
             let tx = await this.mp1.sendRequestTestV2(testData, this.mp2.address, this.br2.address, chainId(argv.net2), {from: this.userNet1, gasPrice: 20000000000, gas: 300_000 });
           }catch(e){
                // unusual process for reason: hardhat + HDWalletProvider
                //console.log(e.message);
                assert.equal(e.receipt?.status === false ? undefined : e.receipt?.status, undefined, `Should be false by UNTRASTED DEX`);
                
            }
        });


    });
})

