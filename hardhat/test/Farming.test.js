const ethers = require('hardhat');
const { constants, expectEvent, expectRevert, BN } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const RelayerPool = artifacts.require('RelayerPool');
const ERC20Mock = artifacts.require('ERC20Mock');


async function timeTravelFor(secs) {
  await ethers.provider.send("evm_increaseTime", [secs]);
  await ethers.provider.send("evm_mine");
}


async function timeTravelAt(timestamp) {
  await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
  await ethers.provider.send("evm_mine");
}


contract('RelayerPool', function (accounts) {
  const [owner, other] = accounts;
  const DECIMALS = new web3.utils.BN(10).pow(new web3.utils.BN(18));
  const INITIAL_ERC20_ACCOUNT_BALANCE = new web3.utils.BN(100).mul(DECIMALS);

  beforeEach(async function () {
    this.depositToken = await ERC20Mock.new("DepositToken", "DepositToken", { from: owner });
    this.rewardToken = await ERC20Mock.new("RewardToken", "RewardToken", { from: owner });

    for (const account of accounts) {
      await this.depositToken.mint(account, INITIAL_ERC20_ACCOUNT_BALANCE, { from: owner });
      await this.rewardToken.mint(account, INITIAL_ERC20_ACCOUNT_BALANCE, { from: owner });
    }

    this.relayerFeeNumerator = 100;  // 1%
    this.emissionRateNumerator = 100;
    this.relayerPool = await RelayerPool.new(
      owner,
      this.rewardToken.address,
      this.depositToken.address,
      this.relayerFeeNumerator,
      this.emissionRateNumerator,
      { from: owner });
  });
});
