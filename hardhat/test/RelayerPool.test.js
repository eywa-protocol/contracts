const { ethers } = require('hardhat');
const { constants, expectEvent, expectRevert, BN } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const RelayerPool = artifacts.require('RelayerPool');
const VaultMock = artifacts.require('VaultMock');
const ERC20Mock = artifacts.require('ERC20Mock');

const chai = require('chai');
chai.use(require('chai-bn')(BN));

async function timeTravelFor(secs) {
    await ethers.provider.send("evm_increaseTime", [secs]);
    await ethers.provider.send("evm_mine");
}

function Enum (...options) {
  return Object.fromEntries(options.map((key, i) => [ key, new BN(i) ]));
}

const RelayerStatus = Enum(
    'Inactive',
    'Online',
    'Offline',
    'BlackListed'
);


async function getTxTimestamp(tx) {
    return await getBlockTimestamp(tx.receipt.blockNumber);
}


async function getBlockTimestamp(blockNumber) {
    const block = await ethers.provider.getBlock(blockNumber);
    return block.timestamp;
}


async function timeTravelAt(timestamp) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
    await ethers.provider.send("evm_mine");
}


function toBN(val) {
    return new BN(val);
}


contract('RelayerPool', function (accounts) {
  const owner = accounts[0];
  const others = accounts.slice(1);
  const DECIMALS =  toBN(10).pow(toBN(18));
  const INITIAL_ERC20_ACCOUNT_BALANCE = new web3.utils.BN(1000000000).mul(DECIMALS);

  beforeEach(async function () {
    this.depositToken = await ERC20Mock.new("DepositToken", "DepositToken", {from: owner});
    this.rewardToken = await ERC20Mock.new("RewardToken", "RewardToken", {from: owner});

    for (const account of accounts) {
      await this.depositToken.mint(account, INITIAL_ERC20_ACCOUNT_BALANCE, {from: owner});
      await this.rewardToken.mint(account, INITIAL_ERC20_ACCOUNT_BALANCE, {from: owner});
    }

    this.vault = await VaultMock.new({from: owner});
    await this.rewardToken.mint(this.vault.address, INITIAL_ERC20_ACCOUNT_BALANCE, {from: owner});

    this.relayerFeeNumerator = 100;  // 1%
    this.emissionAnnualRateNumerator = Math.floor((24 * 3600 * 365)/10);  // 10%
    this.relayerPool = await RelayerPool.new(
        owner,
        this.rewardToken.address,
        this.depositToken.address,
        this.relayerFeeNumerator,
        this.emissionAnnualRateNumerator,
        this.vault.address,
        {from: owner}
    );
    await this.vault.approveInfinity(this.rewardToken.address, this.relayerPool.address);

    this.MIN_RELAYER_STAKING_TIME = await this.relayerPool.MIN_RELAYER_STAKING_TIME();
    this.MIN_STAKING_TIME = await this.relayerPool.MIN_STAKING_TIME();
  });

  it('reverts on depositToken zero address', async function () {
    await expectRevert(RelayerPool.new(
      owner,
      this.rewardToken.address,
      ZERO_ADDRESS,
      this.relayerFeeNumerator,
      this.emissionAnnualRateNumerator,
      this.vault.address,
      {from: owner}),
        "ZERO_ADDRESS"
    );
  });

  it('reverts on rewardToken zero address', async function () {
    await expectRevert(RelayerPool.new(
      owner,
      ZERO_ADDRESS,
      this.depositToken.address,
      this.relayerFeeNumerator,
      this.emissionAnnualRateNumerator,
      this.vault.address,
      {from: owner}),
        "ZERO_ADDRESS"
    );
  });


  it('reverts on vault zero address', async function () {
    await expectRevert(RelayerPool.new(
      owner,
      this.rewardToken.address,
      this.depositToken.address,
      this.relayerFeeNumerator,
      this.emissionAnnualRateNumerator,
      ZERO_ADDRESS,
      {from: owner}),
        "ZERO_ADDRESS"
    );
  });

  it('has an owner', async function () {
    expect(await this.relayerPool.owner()).to.equal(owner);
  });

  it('min staking time', async function () {
    expect(await this.relayerPool.MIN_STAKING_TIME()).to.be.bignumber.equal(toBN(2 * 7 * 24 * 3600));
  });

  it('min relayer staking time', async function () {
    expect(await this.relayerPool.MIN_RELAYER_STAKING_TIME()).to.be.bignumber.equal(toBN(4 * 7 * 24 * 3600));
  });

  it('deposit by the owner', async function () {
    const user = owner;
    const depositAmount = toBN(10).mul(DECIMALS);
    const txApprove = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: user});
    const tx = await this.relayerPool.deposit(depositAmount, {from: user});
    expectEvent(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'id': toBN(0),
          'lockTill': toBN(await getTxTimestamp(tx)).add(this.MIN_RELAYER_STAKING_TIME),
        }
    );
  });

  it('deposit other user with no owner stake', async function () {
    const user = others[0];
    const depositAmount = toBN(10).mul(DECIMALS);
    const txApprove = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: user});
    await expectRevert(
        this.relayerPool.deposit(depositAmount, {from: user}),
        'small owner stake (ownerStaker*6 >= totalStake)',
    );
  });

  it('deposit other user with the owner stake', async function () {
    const depositAmount = toBN(10).mul(DECIMALS);

    const txApproveOwner = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: owner});
    const txOwner = await this.relayerPool.deposit(depositAmount, {from: owner});
    expectEvent(
        txOwner,
        'DepositPut',
        {
          'user': owner,
          'amount': depositAmount,
          'id': toBN(0),
          'lockTill': toBN(await getTxTimestamp(txOwner)).add(this.MIN_RELAYER_STAKING_TIME),
        }
    );

    const user = others[0];
    const txApprove = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: user});
    const tx = await this.relayerPool.deposit(depositAmount, {from: user});
    expectEvent(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'id': toBN(1),
          'lockTill': toBN(await getTxTimestamp(tx)).add(this.MIN_STAKING_TIME),
        }
    );
  });

  it('full withdraw by owner', async function () {
    let tx;
    const user = owner;
    const depositAmount = toBN(10).mul(DECIMALS);
    const txApprove = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: user});
    tx = await this.relayerPool.deposit(depositAmount, {from: user});
    const expectedLockTill = toBN(await getTxTimestamp(tx)).add(this.MIN_RELAYER_STAKING_TIME);
    const expectedDepositId = toBN(0);
    expectEvent(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'id': expectedDepositId,
          'lockTill': expectedLockTill,
        }
    );

    await timeTravelAt(expectedLockTill.toNumber());

    tx = await this.relayerPool.withdraw(expectedDepositId, depositAmount, {from: user});
    expectEvent(
        tx,
        'DepositWithdrawn',
        {
          'user': user,
          'amount': depositAmount,
          'id': toBN(0),
          'rest': toBN(0),
        }
    );
  });

  it('full withdraw by user', async function () {
    let tx;
    const depositAmount = toBN(10).mul(DECIMALS);

    const txApproveOwner = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: owner});
    const txOwner = await this.relayerPool.deposit(depositAmount, {from: owner});
    expectEvent(
        txOwner,
        'DepositPut',
        {
          'user': owner,
          'amount': depositAmount,
          'id': toBN(0),
          'lockTill': toBN(await getTxTimestamp(txOwner)).add(this.MIN_RELAYER_STAKING_TIME),
        }
    );

    const user = others[0];
    const txApprove = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: user});
    tx = await this.relayerPool.deposit(depositAmount, {from: user});
    const expectedDepositId = toBN(1);
    expectEvent(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'id': expectedDepositId,
          'lockTill': toBN(await getTxTimestamp(tx)).add(this.MIN_STAKING_TIME),
        }
    );

    await timeTravelAt(toBN(await getTxTimestamp(tx)).add(this.MIN_STAKING_TIME).toNumber());
    tx = await this.relayerPool.withdraw(expectedDepositId, depositAmount, {from: user});
    expectEvent(
        tx,
        'DepositWithdrawn',
        {
          'user': user,
          'amount': depositAmount,
          'id': expectedDepositId,
          'rest': toBN(0),
        }
    );
  });

  it('partial withdraw by owner FAILED, rest owner deposit is not enough', async function () {
    let tx;
    const depositAmount = toBN(10).mul(DECIMALS);

    const txApproveOwner = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: owner});
    const txOwner = await this.relayerPool.deposit(depositAmount, {from: owner});
    const expectedOwnerDepositId = toBN(0);
    expectEvent(
        txOwner,
        'DepositPut',
        {
          'user': owner,
          'amount': depositAmount,
          'id': expectedOwnerDepositId,
          'lockTill': toBN(await getTxTimestamp(txOwner)).add(this.MIN_RELAYER_STAKING_TIME),
        }
    );

    const user = others[0];
    const txApprove = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: user});
    tx = await this.relayerPool.deposit(depositAmount, {from: user});
    const expectedUserDepositId = toBN(1);
    expectEvent(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'id': expectedUserDepositId,
          'lockTill': toBN(await getTxTimestamp(tx)).add(this.MIN_STAKING_TIME),
        }
    );

    await timeTravelAt(toBN(await getTxTimestamp(txOwner)).add(this.MIN_RELAYER_STAKING_TIME).toNumber());
    const withdrawAmount = depositAmount.mul(toBN(9)).div(toBN(10));  // 90% - FAIL
    await expectRevert(
        this.relayerPool.withdraw(expectedOwnerDepositId, withdrawAmount, {from: owner}),
        "small owner stake (ownerStaker*6 >= totalStake)",
    );
  })

  it('getDeposit works', async function () {
      let tx;
      const depositAmount = toBN(10).mul(DECIMALS);

      const ownerDepositId = toBN(0);
      const txApproveOwner = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: owner});
      const txOwner = await this.relayerPool.deposit(depositAmount, {from: owner});
      expectEvent(
          txOwner,
          'DepositPut',
          {
              'user': owner,
              'amount': depositAmount,
              'id': toBN(0),
              'lockTill': toBN(await getTxTimestamp(txOwner)).add(this.MIN_RELAYER_STAKING_TIME),
          }
      );

      let {user, amount, lockTill} = await this.relayerPool.getDeposit(toBN(0));
      expect(user).to.be.equal(owner);
      expect(amount).to.be.bignumber.equal(depositAmount);
      expect(lockTill).to.be.bignumber.equal(toBN(await getTxTimestamp(txOwner)).add(this.MIN_RELAYER_STAKING_TIME));
  });

    it('getDeposit returns zeros for non-exist', async function () {
      const nonExist = toBN(9000);
      let {user, amount, lockTill} = await this.relayerPool.getDeposit(nonExist);
      expect(user).to.be.equal(ZERO_ADDRESS);
      expect(amount).to.be.bignumber.equal(toBN(0));
      expect(lockTill).to.be.bignumber.equal(toBN(0));
  });

  it('partial withdraw by owner OK, rest owner deposit is enough', async function () {
    let tx;
    const depositAmount = toBN(10).mul(DECIMALS);

    const ownerDepositId = toBN(0);
    const txApproveOwner = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: owner});
    const txOwner = await this.relayerPool.deposit(depositAmount, {from: owner});
    expectEvent(
        txOwner,
        'DepositPut',
        {
          'user': owner,
          'amount': depositAmount,
          'id': toBN(0),
          'lockTill': toBN(await getTxTimestamp(txOwner)).add(this.MIN_RELAYER_STAKING_TIME),
        }
    );

    const user = others[0];
    const txApprove = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: user});
    tx = await this.relayerPool.deposit(depositAmount, {from: user});
    const expectedDepositId = toBN(1);
    expectEvent(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'id': expectedDepositId,
          'lockTill': toBN(await getTxTimestamp(tx)).add(this.MIN_STAKING_TIME),
        }
    );

    await timeTravelAt(toBN(await getTxTimestamp(txOwner)).add(this.MIN_RELAYER_STAKING_TIME).toNumber());
    const withdrawAmount = depositAmount.mul(toBN(5)).div(toBN(10));  // 40% - OK
    tx = await this.relayerPool.withdraw(ownerDepositId, withdrawAmount, {from: owner});
    expectEvent(
        tx,
        'DepositWithdrawn',
        {
          'user': owner,
          'amount': withdrawAmount,
          'id': ownerDepositId,
          'rest': depositAmount.sub(withdrawAmount),
        }
    );
  })

  it('partial withdraw by user', async function () {
    let tx;
    const depositAmount = toBN(10).mul(DECIMALS);

    const txApproveOwner = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: owner});
    const txOwner = await this.relayerPool.deposit(depositAmount, {from: owner});
    expectEvent(
        txOwner,
        'DepositPut',
        {
          'user': owner,
          'amount': depositAmount,
          'id': toBN(0),
          'lockTill': toBN(await getTxTimestamp(txOwner)).add(this.MIN_RELAYER_STAKING_TIME),
        }
    );

    const user = others[0];
    const txApprove = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: user});
    tx = await this.relayerPool.deposit(depositAmount, {from: user});
    const expectedDepositId = toBN(1);
    expectEvent(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'id': expectedDepositId,
          'lockTill': toBN(await getTxTimestamp(tx)).add(this.MIN_STAKING_TIME),
        }
    );

    await timeTravelAt(toBN(await getTxTimestamp(tx)).add(this.MIN_STAKING_TIME).toNumber());
    const withdrawAmount = depositAmount.mul(toBN(4)).div(toBN(10));
    tx = await this.relayerPool.withdraw(expectedDepositId, withdrawAmount, {from: user});
    expectEvent(
        tx,
        'DepositWithdrawn',
        {
          'user': user,
          'amount': withdrawAmount,
          'id': expectedDepositId,
          'rest': depositAmount.sub(withdrawAmount),
        }
    );
  });

  it('withdraw before unlock by owner failed', async function () {
    let tx;
    const depositAmount = toBN(10).mul(DECIMALS);
    const txApprove = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: owner});
    tx = await this.relayerPool.deposit(depositAmount, {from: owner});
    const expectedLockTill = toBN(await getTxTimestamp(tx)).add(this.MIN_RELAYER_STAKING_TIME);
    const expectedDepositId = toBN(0);
    expectEvent(
        tx,
        'DepositPut',
        {
          'user': owner,
          'amount': depositAmount,
          'id': expectedDepositId,
          'lockTill': expectedLockTill,
        }
    );

    await timeTravelAt(expectedLockTill.toNumber() - 10);  // unlock did not happen
    await expectRevert(
        this.relayerPool.withdraw(expectedDepositId, depositAmount, {from: owner}),
        "DEPOSIT_IS_LOCKED",
    );
  })

  it('withdraw by user DEPOSIT_IS_LOCKED', async function () {
    let tx;
    const depositAmount = toBN(10).mul(DECIMALS);

    const txApproveOwner = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: owner});
    const txOwner = await this.relayerPool.deposit(depositAmount, {from: owner});
    expectEvent(
        txOwner,
        'DepositPut',
        {
          'user': owner,
          'amount': depositAmount,
          'id': toBN(0),
          'lockTill': toBN(await getTxTimestamp(txOwner)).add(this.MIN_RELAYER_STAKING_TIME),
        }
    );

    const user = others[0];
    const txApprove = await this.depositToken.approve(this.relayerPool.address, depositAmount, {from: user});
    tx = await this.relayerPool.deposit(depositAmount, {from: user});
    const expectedDepositId = toBN(1);
    expectEvent(
        tx,
        'DepositPut',
        {
          'user': user,
          'amount': depositAmount,
          'id': expectedDepositId,
          'lockTill': toBN(await getTxTimestamp(tx)).add(this.MIN_STAKING_TIME),
        }
    );

    await timeTravelAt(toBN(await getTxTimestamp(tx)).add(this.MIN_STAKING_TIME).toNumber() - 10);  // unlock did not happen
    await expectRevert(
        this.relayerPool.withdraw(expectedDepositId, depositAmount, {from: user}),
        "DEPOSIT_IS_LOCKED",
    );
  })


  it('default RelayerStatus', async function () {
      const status = await this.relayerPool.relayerStatus();
      expect(status).to.be.bignumber.equal(RelayerStatus.Inactive);
  });

  // it('setRelayerStatus works', async function () {
  //     const tx = await this.relayerPool.setRelayerStatus(RelayerStatus.Online, {from: owner});  // online
  //     const status = await this.relayerPool.relayerStatus();
  //     expect(status).to.be.bignumber.equal(RelayerStatus.Online);
  // });

  // it('setRelayerStatus invalid value', async function () {
  //     const tx = await this.relayerPool.setRelayerStatus(toBN(42), {from: owner});
  // });

  // it('setRelayerStatus sameValue reverts', async function () {
  //     await expectRevert(
  //         this.relayerPool.setRelayerStatus(RelayerStatus.Inactive, {from: owner}),
  //         'SAME_VALUE',
  //     );
  // });

  // it('setRelayerStatus not registry reverts', async function () {
  //     await expectRevert(
  //         this.relayerPool.setRelayerStatus(RelayerStatus.Online, {from: others[1]}),
  //         'only registry',
  //     );
  // });

  it('setRelayerFeeNumerator works', async function () {
      const user = owner;
      const value = toBN(100);  // 1%
      const tx = await this.relayerPool.setRelayerFeeNumerator(value, {from: user});
      expectEvent(
        tx,
        'RelayerFeeNumeratorSet',
        {
          'sender': user,
          'value': value,
        }
    );
  });

  it('setRelayerFeeNumerator FEE_IS_TOO_LOW', async function () {
    await expectRevert(
        this.relayerPool.setRelayerFeeNumerator(10, {from: owner}),
        'FEE_IS_TOO_LOW',
    );
  });

  it('setRelayerFeeNumerator FEE_IS_TOO_HIGH', async function () {
    await expectRevert(
        this.relayerPool.setRelayerFeeNumerator(10000 + 1, {from: owner}),
        'FEE_IS_TOO_HIGH',
    );
  });
  //
  // it('setRelayerFeeNumerator not registry reverts', async function () {/*todo*/});
  //

  it('harvest', async function () {
    const depositOwnerAmount = toBN(10).mul(DECIMALS);

    const txOwnerApprove = await this.depositToken.approve(this.relayerPool.address, depositOwnerAmount, {from: owner});
    const txOwner = await this.relayerPool.deposit(depositOwnerAmount, {from: owner});
    expectEvent(
        txOwner,
        'DepositPut',
        {
          'user': owner,
          'amount': depositOwnerAmount,
          'id': toBN(0),
          'lockTill': toBN(await getTxTimestamp(txOwner)).add(this.MIN_RELAYER_STAKING_TIME),
        }
    );

    const user = others[0];
    const depositUserAmount = toBN(5).mul(DECIMALS);
    const txUserApprove = await this.depositToken.approve(this.relayerPool.address, depositUserAmount, {from: user});
    const txUserDeposit = await this.relayerPool.deposit(depositUserAmount, {from: user});
    const expectedDepositId = toBN(1);
    expectEvent(
        txUserDeposit,
        'DepositPut',
        {
          'user': user,
          'amount': depositUserAmount,
          'id': expectedDepositId,
          'lockTill': toBN(await getTxTimestamp(txUserDeposit)).add(this.MIN_STAKING_TIME),
        }
    );
    const putDepositTimestamp = await getTxTimestamp(txUserDeposit);

    const travelForPeriod = 3600;
    await timeTravelFor(travelForPeriod);

    const expectedTotalDeposit = depositUserAmount.add(depositOwnerAmount);
    const totalDeposit = await this.relayerPool.totalDeposit();
    expect(totalDeposit).to.be.bignumber.equal(expectedTotalDeposit);
    const rewardPerTokenNumeratorBefore = await this.relayerPool.rewardPerTokenNumerator();

    const txHarvestPoolDeposit = await this.relayerPool.harvestPoolReward({from: user});

    const harvestTimestamp = await getTxTimestamp(txHarvestPoolDeposit);
    const actualPeriod = toBN(harvestTimestamp - putDepositTimestamp);
    const emissionAnnualRateNumerator = await this.relayerPool.emissionAnnualRateNumerator();

    const expectedProfit = actualPeriod.mul(emissionAnnualRateNumerator).mul(totalDeposit).div(toBN(365*24*3600));
    const expectedFee = expectedProfit.mul(await this.relayerPool.relayerFeeNumerator()).div(toBN(10000));
    const expectedRewardForPool = expectedProfit.sub(expectedFee);
    const expectedRewardPerTokenNumeratorDelta = expectedRewardForPool.mul(DECIMALS).div(totalDeposit);
    const expectedRewardPerTokenNumerator = expectedRewardPerTokenNumeratorDelta.add(rewardPerTokenNumeratorBefore);
    expectEvent(
        txHarvestPoolDeposit,
        'HarvestPoolReward',
        {
          'sender': user,
          'harvestForPeriod': actualPeriod,
          'profit': expectedProfit,
          'feeReceiver': (await this.relayerPool.owner()),
          'fee': expectedFee,
          'rewardForPool': expectedRewardForPool,
          'rewardPerTokenNumeratorBefore': rewardPerTokenNumeratorBefore,
          'rewardPerTokenNumerator': expectedRewardPerTokenNumerator,
          'totalDeposit': totalDeposit,
        }
    );

    const txHarvestMyDeposit = await this.relayerPool.harvestMyReward({from: user});
    const usedRewardPerToken = expectedRewardPerTokenNumerator.sub(rewardPerTokenNumeratorBefore);
    const expectedUserReward = usedRewardPerToken.mul(depositUserAmount).div(DECIMALS);

    expectEvent(
        txHarvestMyDeposit,
        'UserHarvestReward',
        {
          'user': user,
          'userReward': expectedUserReward,
          'userDeposit': depositUserAmount,
        }
    );
  });

});
