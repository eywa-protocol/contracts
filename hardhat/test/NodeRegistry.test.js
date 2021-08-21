const {ethers}  = require('hardhat');
const crypto = require('crypto');
const helper = require('../utils/helper-permit');
const { constants, expectEvent, expectRevert, BN } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');
const { PERMIT_TYPEHASH, getPermitDigest, getDomainSeparator, sign } = require('../utils/signatures.js')
const name = "EYWA"


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
  // const signer = ethers.getSigners()
  const DECIMALS =  new web3.utils.BN(10).pow(new web3.utils.BN(18));
  const INITIAL_ERC20_ACCOUNT_BALANCE = new web3.utils.BN(100).mul(DECIMALS);
  const DEPOSIT = new web3.utils.BN(10).mul(DECIMALS);

  beforeEach(async function () {
  //   depositToken = await ERC20Mock.new("EYWA", "EYWA", {from: owner}); 
  //   nodeRegistry = await NodeRegistry.new(depositToken.address, generateAddress(), generateAddress(), {from: owner});
  //   chainId = await web3.eth.getChainId();
  //   // chainId = 31337  
  //  //console.log("Token ",depositToken.address) //
  //   //console.log("Node Registry ", nodeRegistry.address) //

  //   for (const account of accounts) {
  //     await depositToken.mint(account, INITIAL_ERC20_ACCOUNT_BALANCE, {from: owner});
  //   }
  });

  it('initializes DOMAIN_SEPARATOR and PERMIT_TYPEHASH correctly', async () => {
    depositToken = await ERC20Mock.new("EYWA", "EYWA", {from: owner}); 
    nodeRegistry = await NodeRegistry.new(depositToken.address, generateAddress(), generateAddress(), {from: owner});
    chainId = await web3.eth.getChainId();
    // chainId = 31337  
   //console.log("Token ",depositToken.address) //
    //console.log("Node Registry ", nodeRegistry.address) //

      await depositToken.mint(owner, INITIAL_ERC20_ACCOUNT_BALANCE, {from: owner});


     assert.equal(await depositToken._PERMIT_TYPEHASH(), PERMIT_TYPEHASH)
    
    assert.equal(await depositToken.DOMAIN_SEPARATOR(), getDomainSeparator(name, depositToken.address, chainId))
  })


  // it('permits and emits Approval (replay safe)', async () => {

  //   // Create the approval request
  //   const approve = {
  //     owner: owner,
  //     spender: nodeRegistry.address,
  //     value: 100000000000000,
  //   }

  //   // deadline as much as you want in the future
  //   const deadline = 100000000000000

  //   // Get the user's nonce
  //   const nonce = await depositToken.nonces(owner); console.log(owner)

  //   // Get the EIP712 digest
  //   const digest = getPermitDigest(name, depositToken.address, chainId, approve, 1, deadline)

  //   // Sign it
  //   // NOTE: Using web3.eth.sign will hash the message internally again which
  //   // we do not want, so we're manually signing here
  //   const ownerPrivateKey = Buffer.from('a6e59c67c4a37b60c9da60765b8924a870881d7b79b9032a9a4ec9b92d65bc3e', 'hex')
  //   const { v, r, s } = sign(digest, ownerPrivateKey)
  //   console.log(v )
  //   // Approve it
  //   const receipt = await depositToken.permit(approve.owner, approve.spender, approve.value, deadline, v, r ,s)
  //   const event = receipt.logs[0]

  //   // It worked!
  //   // assert.equal(event.event, 'Approval')
  //   assert.equal(await depositToken.nonces(owner), 1)
  //   assert.equal(await depositToken.allowance(approve.owner, approve.spender), approve.value)

  //   // // Re-using the same sig doesn't work since the nonce has been incremented
  //   // // on the contract level for replay-protection
  //   // await expectRevert(
  //   //   depositToken.permit(approve.owner, approve.spender, approve.value, deadline, v, r, s),
  //   //   'ERC20Permit: invalid signature'
  //   // )

  //   // invalid ecrecover's return address(0x0), so we must also guarantee that
  //   // this case fails
  //   // await expectRevert(
  //   //   depositToken.permit(
  //   //     '0x0000000000000000000000000000000000000000',
  //   //     approve.spender,
  //   //     approve.value,
  //   //     deadline,
  //   //     '0x99',
  //   //     r,
  //   //     s
  //   //   ),
  //   //   'ERC20Permit: invalid signature'
  //   // )
  // })


  it('Should create a new relayer and register the node', async function () {
    this.node = generateNode(owner)
    this.permit = await helper.signPermit(owner, nodeRegistry.address, 1e18.toString(), depositToken, 1)
    this.permit1 = await helper.signPermit1(owner, nodeRegistry.address, 1e18.toString(), depositToken.address)
    console.log("PERMIT", this.permit)
    console.log("PERMIT1",this.permit1)

    console.log(await depositToken.name())

    // await depositToken.permit(
    //   owner, 
    //   nodeRegistry.address, 
    //   1e18.toString(), 
    //   this.permit.deadline,
    //   this.permit.v,
    //   this.permit.r,
    //   this.permit.s,
    //   {from: owner})

    //   console.log('ALLOWANCE IS:', parseInt(await depositToken.allowance(owner, nodeRegistry.address)))

      await depositToken.permit(
        owner, 
        nodeRegistry.address, 
        1e18.toString(), 
        this.permit1.deadline,
        this.permit1.v,
        this.permit1.r,
        this.permit1.s,
        {from: owner})
  
        console.log('ALLOWANCE IS:', parseInt(await depositToken.allowance(owner, nodeRegistry.address)))
  

    // const permitArgs = [
    //   this.permit.owner,
    //   this.permit.value,
    //   this.permit.deadline,
    //   this.permit.v,
    //   this.permit.r,
    //   this.permit.s
    // ]

    // const permitData = ethers.utils.defaultAbiCoder.encode(["address", "uint256", "uint256", "uint8", "bytes32", "bytes32"], permitArgs)

    // console.log(Promise.resolve(permitData))

    // await nodeRegistry.createRelayer(
    //   this.node,
    //   this.permit.deadline,
    //   this.permit.v,
    //   this.permit.r,
    //   this.permit.s,
    //   {from: owner})
 

  });


});
