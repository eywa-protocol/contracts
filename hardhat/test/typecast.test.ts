import { artifacts, contract, ethers } from 'hardhat';
import { assert, expect } from 'chai';

import type { Typecast } from '../artifacts-types/Typecast';

const CTypecast = artifacts.require("Typecast");


const a1 = '0x1234567890123456789012345678901234567890';
const x1 = '0x0000000000000000000000001234567890123456789012345678901234567890';


contract("Typecast from web3", (/* accounts */) => {
  it("Should cast", async function () {
    const caster = await CTypecast.new();

    const x2 = await caster.methods['castToBytes(address)'](a1);
    // console.log('x2:', x2);
    assert.equal(x1, x2);

    const a2 = await caster.castToAddress(x2);
    // console.log('a2:', a2);
    assert.equal(a1, a2);
  });
});


describe("Typecast from ethers", function () {
  it("Should cast", async function () {
    const Сaster = await ethers.getContractFactory("Typecast");
    const caster = await Сaster.deploy() as Typecast;
    await caster.deployed();

    const x2 = await caster['castToBytes(address)'](a1);
    // console.log('x2:', x2);
    expect(x1).to.equal(x2);

    const a2 = await caster.castToAddress(x2);
    // console.log('a2:', a2);
    expect(a1).to.equal(a2);
  });
});
