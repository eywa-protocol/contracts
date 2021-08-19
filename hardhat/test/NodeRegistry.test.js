const ethers  = require('hardhat');
const crypto = require('crypto');
const helper = require('../utils/helper-permit');
const { constants, expectEvent, expectRevert, BN } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const NodeRegistry = artifacts.require('NodeRegistry');
const ERC20Mock = artifacts.require('TestTokenPermit');

function generateNode(poolOwner) {
  this.relayerFeeNumerator = 100;  // 1%
  this.emissionRateNumerator = 100;

  return {
    owner: poolOwner,
    nodeWallet: generateAddress(),
    nodeIdAddress: generateAddress(),
    pool: ZERO_ADDRESS ,
    blsPubKey: "test",
    nodeId: 0,
    version: 1,
    relayerFeeNumerator: this.relayerFeeNumerator ,
    emissionRateNumerator: this.emissionRateNumerator,
    status: 1,
    nodeType: 1
  }
}


function generateAddress(){
return "0x"+crypto.randomBytes(20).toString('hex')
}


contract('NodeRegistry', function (accounts) {
  const [owner, other] = accounts;
  const DECIMALS =  new web3.utils.BN(10).pow(new web3.utils.BN(18));
  const INITIAL_ERC20_ACCOUNT_BALANCE = new web3.utils.BN(100).mul(DECIMALS);
  const DEPOSIT = new web3.utils.BN(10).mul(DECIMALS);

  beforeEach(async function () {
    depositToken = await ERC20Mock.new("EYWA", "EYWA", {from: owner}); 
    nodeRegistry = await NodeRegistry.new(depositToken.address, generateAddress(), generateAddress(), {from: owner});

    for (const account of accounts) {
      await depositToken.mint(account, INITIAL_ERC20_ACCOUNT_BALANCE, {from: owner});
    }
  });

  it('Should create a new relayer and register the node', async function () {
    this.node = generateNode(owner)
    this.permit = await helper.signPermit(owner, nodeRegistry.address, 1e18.toString(), depositToken, 1)
    console.log(this.permit)


    await nodeRegistry.createRelayer(
      this.node,
      this.permit.deadline,
      this.permit.v,
      this.permit.r,
      this.permit.s,
      {from: owner})
 

  });


});
