import { ethers } from 'hardhat';
import { expect } from 'chai';

import type {
  Bridge,
  OracleRequestSolanaEvent,
} from '../../artifacts-types/Bridge';
import type { Portal } from '../../artifacts-types/Portal';
import type { Synthesis } from '../../artifacts-types/Synthesis';


// uint256 public
const SOLANA_CHAIN_ID = 501501501;

const sighashEmergencyUnsynthesize = '666b97328dacf43f';
const sighashUnsynthesize = '73ea6f6d83a72546';
const sighashMintSyntheticToken = '2cfd0165828b124e';
const sighashEmergencyUnburn = '9584687b9d5515a1';

const dumb = '0x1234567890123456789012345678901234567890';
const dumb32 = '0x0000000000000000000000001234567890123456789012345678901234567890';
    
const pkReadonly = '0000';
const pkWritable = '0001';
const pkSigner = '0100';
const pidToken = '06ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a9';
const pidRent = '06a7d517192c5c51218cc94c3d4af17f58daee089ba1fd44e3dbd98a00000000';
const pidSystem = '0000000000000000000000000000000000000000000000000000000000000000';

const hex = '0123456789abcdef';
const prfx = '0x000000000000000000000000123456789012345678901234567890123456780';
let i = 0;
const dumbReceiveSide = `${ prfx }${ hex[++i] }`;
const dumbReceiveSideData = `${ prfx }${ hex[++i] }`;
const dumbOppositeBridge = `${ prfx }${ hex[++i] }`;
const dumbOppositeBridgeData = `${ prfx }${ hex[++i] }`;
const dumbTxState = `${ prfx }${ hex[++i] }`;
const dumbSource = `${ prfx }${ hex[++i] }`;
const dumbDestination = `${ prfx }${ hex[++i] }`;
const dumbRealToken = `${ prfx }${ hex[++i] }`;
const dumbChain2address = `${ prfx }${ hex[++i] }`;
const dumbSyntToken = `${ prfx }${ hex[++i] }`;
const dumbSyntTokenData = `${ prfx }${ hex[++i] }`;

const dumbsUnsynthesize = [
  dumbReceiveSide,
  dumbReceiveSideData,
  dumbOppositeBridge,
  dumbOppositeBridgeData,
  dumbTxState,
  dumbSource,
  dumbDestination,
  dumbRealToken,
];

const dumbsSynthesize = [
  dumbChain2address,
  dumbReceiveSide,
  dumbReceiveSideData,
  dumbOppositeBridge,
  dumbOppositeBridgeData,
  dumbSyntToken,
  dumbSyntTokenData,
  dumbTxState,
];


describe("Solana calldata", function () {
  let bridge1: Bridge;
  let bridge2: Bridge;
  let portalAddress32: string;
  let portal: Portal;
  let synthesisAddress32: string;
  let synthesis: Synthesis;

  before(async () => {
    const CBridge = await ethers.getContractFactory("Bridge");
    const CPortal = await ethers.getContractFactory("Portal");
    const CSynthesis = await ethers.getContractFactory("Synthesis");

    bridge1 = await CBridge.deploy(/* listNode.address */ dumb, /* forwarder */ dumb);
    await bridge1.deployed();

    portal = await CPortal.deploy(bridge1.address, dumb);
    await portal.deployed();

    bridge2 = await CBridge.deploy(/* listNode.address */ dumb, /* forwarder */ dumb);
    await bridge2.deployed();

    synthesis = await CSynthesis.deploy(bridge2.address, dumb);
    await synthesis.deployed();

    portalAddress32 = `0x000000000000000000000000${ portal.address.substr(2) }`;
    expect(portalAddress32.length).equal(dumb32.length);

    synthesisAddress32 = `0x000000000000000000000000${ synthesis.address.substr(2) }`;
    expect(synthesisAddress32.length).equal(dumb32.length);

    // require(is_in[to] == false, "TO ALREADY EXIST");
    await bridge1.addContractBind(portalAddress32, dumbOppositeBridge, dumbReceiveSide);
    await bridge2.addContractBind(synthesisAddress32, dumbOppositeBridge, dumbReceiveSide);
  });

  it("Should emit OracleRequestSolana event from Portal.synthesize_32", async function () {
    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve) => {
      bridge1.once("OracleRequestSolana", (...args) => {
        resolve(args[args.length - 1]);
      });  
    });

    const amount = 3.5 * 1000 * 1000;
    const bumpTxState = '53';
    await portal.synthesize_32(dumb, amount, dumbsSynthesize, `0x${ bumpTxState }`, SOLANA_CHAIN_ID);
    
    const ev = await pEvent;
    expect(ev.event).equals('OracleRequestSolana');
    expect(ev.args.selector.substr(2)).equals([
      '09000000', // accounts.length
      dumbReceiveSideData.substr(2), pkWritable,
      dumbSyntToken.substr(2), pkWritable,
      dumbSyntTokenData.substr(2), pkReadonly,
      dumbTxState.substr(2), pkWritable,
      dumbChain2address.substr(2), pkWritable,
      pidToken, pkReadonly,
      pidSystem, pkReadonly,
      pidRent, pkReadonly,
      dumbOppositeBridgeData.substr(2), pkSigner,
      dumbReceiveSide.substr(2), // pid
      '31000000', // data.length
      sighashMintSyntheticToken,
      'f3a0380063eec300e6206e2a4d8d4eb33659e163790133292fa333aca65045c3', // txId
      bumpTxState,
      'e067350000000000', // amount
    ].join(''));
  });
  
  it("Should emit OracleRequestSolana event from Portal.emergencyUnburnRequest_32", async function () {
    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve) => {
      bridge1.once("OracleRequestSolana", (...args) => {
        resolve(args[args.length - 1]);
      });  
    });

    await portal.emergencyUnburnRequest_32(dumb32, dumbsSynthesize, SOLANA_CHAIN_ID);

    const ev = await pEvent;
    expect(ev.event).equals('OracleRequestSolana');
    // console.log('OracleRequestSolana selector');
    // console.log(ev.args.selector.substr(2).match(/(.|[\r\n]){1,64}/g));
    expect(ev.args.selector.substr(2)).equals([
      '07000000', // accounts.length
      dumbReceiveSideData.substr(2), pkReadonly,
      dumbTxState.substr(2), pkWritable,
      dumbSyntToken.substr(2), pkWritable,
      dumbSyntTokenData.substr(2), pkReadonly,
      dumbChain2address.substr(2), pkWritable,
      pidToken, pkReadonly,
      dumbOppositeBridgeData.substr(2), pkSigner,
      dumbReceiveSide.substr(2), // pid
      '08000000', // data.length
      sighashEmergencyUnburn,
    ].join(''));
  });

  it("Should emit OracleRequestSolana event from Synthesis.emergencyUnsyntesizeRequest_32", async function () {
    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve) => {
      bridge2.once("OracleRequestSolana", (...args) => {
        resolve(args[args.length - 1]);
      });  
    });

    const bumpTxState = '77';
    await synthesis.emergencyUnsyntesizeRequest_32(dumbsUnsynthesize, `0x${ bumpTxState }`, SOLANA_CHAIN_ID);

    const ev = await pEvent;
    expect(ev.event).equals('OracleRequestSolana');

    expect(ev.args.selector.substr(2)).equals([
      '07000000', // accounts.length
      dumbReceiveSideData.substr(2), pkReadonly,
      dumbTxState.substr(2), pkWritable,
      dumbRealToken.substr(2), pkReadonly,
      dumbSource.substr(2), pkWritable,
      dumbDestination.substr(2), pkWritable,
      dumbOppositeBridgeData.substr(2), pkSigner,
      pidToken, pkReadonly,
      dumbReceiveSide.substr(2), // pid
      '09000000', // data.length
      sighashEmergencyUnsynthesize,
      bumpTxState,
    ].join(''));
  });

  it("Should emit OracleRequestSolana event from Synthesis.burnSyntheticToken_32", async function () {
    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve) => {
      bridge2.once("OracleRequestSolana", (...args) => {
        resolve(args[args.length - 1]);
      });  
    });

    const amount = 3.5 * 1000 * 1000;
    await synthesis.burnSyntheticToken_32(dumb, dumbsUnsynthesize, amount, SOLANA_CHAIN_ID);

    const ev = await pEvent;
    expect(ev.event).equals('OracleRequestSolana');

    expect(ev.args.selector.substr(2)).equals([
      '09000000', // accounts.length
      dumbReceiveSideData.substr(2), pkReadonly,
      dumbRealToken.substr(2), pkReadonly,
      dumbTxState.substr(2), pkWritable,
      dumbSource.substr(2), pkWritable,
      dumbDestination.substr(2), pkWritable,
      dumbOppositeBridgeData.substr(2), pkSigner,
      pidToken, pkReadonly,
      pidRent, pkReadonly,
      pidSystem, pkReadonly,
      dumbReceiveSide.substr(2),
      '10000000', // data.length
      sighashUnsynthesize,
      'e067350000000000', // amount
    ].join(''));
  });
});
