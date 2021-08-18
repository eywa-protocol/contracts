import { ethers, waffle } from 'hardhat';
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
  const DECIMALS = BN(10).pow(BN(18));
  const INITIAL_ERC20_ACCOUNT_BALANCE = BN(100).mul(DECIMALS);

  beforeEach(async function () {
    this.depositToken = await ERC20Mock.new("DepositToken", "DepositToken", {from: owner});
    this.rewardToken = await ERC20Mock.new("RewardToken", "RewardToken", {from: owner});

    for (const account of accounts) {
      await this.depositToken.mintTo(account, INITIAL_ERC20_ACCOUNT_BALANCE, {from: owner});
      await this.rewardToken.mintTo(account, INITIAL_ERC20_ACCOUNT_BALANCE, {from: owner});
    }

    this.relayerFeeNumerator = 100;  // 1%
    this.emissionRateNumerator = 100;
    this.relayerPool = await RelayerPool.new(
        this.relayerFeeNumerator,
        this.emissionRateNumerator,
        this.depositToken.address,
        this.rewardToken.address,
        {from: owner});
  });

  it('reverts on depositToken zero address', async function () {
    await expectRevert(RelayerPool.new(
        this.relayerFeeNumerator,
        this.emissionRateNumerator,
        ZERO_ADDRESS,
        this.rewardToken.address,
        {from: owner}),
        "ZERO_ADDRESS"
    );
  });

  it('reverts on rewardToken zero address', async function () {
    await expectRevert(RelayerPool.new(
        this.relayerFeeNumerator,
        this.emissionRateNumerator,
        this.depositToken.address,
        ZERO_ADDRESS,
        {from: owner}),
        "ZERO_ADDRESS"
    );
  });

  it('has an owner', async function () {
    expect(await this.relayerPool.owner()).to.equal(owner);
  });

  it('deposit owner', async function () {
    const user = owner;
    const depositAmount = BN(10).mul(DECIMALS);
    const tx = await this.relayerPool.deposit(depositAmount, {from: user});
    expectEvent.inLogs(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'depositId': 0,
          'lockTill': tx.timestamp + (await this.relayerPool.MIN_RELAYER_STAKING_TIME())
        }
    );
  });

  it('deposit other user', async function () {
    const user = other[0];
    const depositAmount = BN(10).mul(DECIMALS);
    const tx = await this.relayerPool.deposit(depositAmount, {from: user});
    expectEvent.inLogs(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'depositId': 0,
          'lockTill': tx.timestamp + (await this.relayerPool.MIN_STAKING_TIME()),
        }
    );
  });

  it('full withdraw by owner', async function () {
    let tx;
    const user = owner;
    const depositAmount = BN(10).mul(DECIMALS);
    tx = await this.relayerPool.deposit(depositAmount, {from: user});
    const expectedLockTill = tx.timestamp + (await this.relayerPool.MIN_STAKING_TIME());
    const expectedDepositId = 0;
    expectEvent.inLogs(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'depositId': expectedDepositId,
          'lockTill': expectedLockTill,
        }
    );

    await timeTravelAt(expectedLockTill);

    tx = await this.relayerPool.withdraw(expectedDepositId, depositAmount, {from: user});
    expectEvent.inLogs(
        tx,
        'DepositWithdrawn',
        {
          'user': user,
          'amount': depositAmount,
          'depositId': 0,
          'lockTill': lockTill,
          'rest': 0,
        }
    );
  });

  it('full withdraw by user', async function () {/*todo*/});

  it('partial withdraw', async function () {
    let tx;
    const user = owner;
    const depositAmount = BN(10).mul(DECIMALS);
    tx = await this.relayerPool.deposit(depositAmount, {from: user});
    const expectedLockTill = tx.timestamp + (await this.relayerPool.MIN_STAKING_TIME());
    const expectedDepositId = 0;
    expectEvent.inLogs(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'depositId': expectedDepositId,
          'lockTill': expectedLockTill,
        }
    );

    await timeTravelAt(expectedLockTill);

    tx = await this.relayerPool.withdraw(expectedDepositId, BN(2).mul(DECIMALS), {from: user});
    expectEvent.inLogs(
        tx,
        'DepositWithdrawn',
        {
          'user': user,
          'amount': BN(2).mul(DECIMALS),
          'depositId': 0,
          'lockTill': lockTill,
          'rest': BN(8).mul(DECIMALS),
        }
    );
  });

  it('withdraw before unlock reverts', async function () {
        let tx;
    const user = owner;
    const depositAmount = BN(10).mul(DECIMALS);
    tx = await this.relayerPool.deposit(depositAmount, {from: user});
    const expectedLockTill = tx.timestamp + (await this.relayerPool.MIN_STAKING_TIME());
    const expectedDepositId = 0;
    expectEvent.inLogs(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'depositId': expectedDepositId,
          'lockTill': expectedLockTill,
        }
    );

    await timeTravelAt(expectedLockTill-1);
    await expectRevert(
        this.relayerPool.withdraw(expectedDepositId, depositAmount, {from: user}),
        'DEPOSIT_IS_LOCKED',
    );
  });
  it('setRelayerStatus works', async function () {/*todo*/});
  it('setRelayerStatus sameValue reverts', async function () {/*todo*/});
  it('setRelayerStatus not registry reverts', async function () {/*todo*/});
  it('setRelayerFeeNumerator works', async function () {/*todo*/});

  it('setRelayerFeeNumerator FEE_IS_TOO_LOW', async function () {
    await expectRevert(
        this.relayerPool.setRelayerFeeNumerator(10, {from: owner}),
        'FEE_IS_TOO_LOW',
    );
  });

  it('setRelayerFeeNumerator FEE_IS_TOO_HIGH', async function () {
    await expectRevert(
        this.relayerPool.setRelayerFeeNumerator(9000, {from: owner}),
        'FEE_IS_TOO_HIGH',
    );
  });
  it('setRelayerFeeNumerator not registry reverts', async function () {/*todo*/});

  it('harvestReward', async function () {
    let tx;
    const user = owner;
    const depositAmount = BN(10).mul(DECIMALS);
    tx = await this.relayerPool.deposit(depositAmount, {from: user});
    const expectedLockTill = tx.timestamp + (await this.relayerPool.MIN_STAKING_TIME());
    const expectedDepositId = 0;
    expectEvent.inLogs(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'depositId': expectedDepositId,
          'lockTill': expectedLockTill,
        }
    );

    const period = 100;
    timeTravelFor(period);

    tx = await this.relayerPool.harvest({from: owner});
    expectEvent.inLogs(
        tx,
        'Harvest',
        {
          'timestamp': tx.timestamp,
          'harvestForPeriod': period,
          'profit': expectedDepositId,
          'lockTill': expectedLockTill,
        }
    );

    await timeTravelAt(expectedLockTill);
  });
});
