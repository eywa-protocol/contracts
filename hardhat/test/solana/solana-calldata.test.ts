import { ethers, upgrades, artifacts } from 'hardhat';
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
  let bridge: Bridge;
  let portalAddress32: string;
  let portal: Portal;
  let synthesisAddress32: string;
  let synthesis: Synthesis;

  before(async () => {
    const _Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await _Forwarder.deploy();
    await forwarder.deployed();
    console.log("Forwarder address:", forwarder.address);

    // Deploy Bridge
    const _Bridge = await ethers.getContractFactory("Bridge");
    /* const */ bridge = (await upgrades.deployProxy(_Bridge, [forwarder.address], { initializer: 'initialize' })) as Bridge;
    await bridge.deployed();
    console.log("Bridge address:", bridge.address);

    const _Portal = await ethers.getContractFactory("Portal");
    /* const */ portal = (await upgrades.deployProxy(_Portal, [bridge.address, forwarder.address], { initializer: 'initializeFunc' })) as Portal;
    await portal.deployed();
    console.log("Portal address:", portal.address);

    const _Synthesis = await ethers.getContractFactory("Synthesis");
    /* const */ synthesis = (await upgrades.deployProxy(_Synthesis, [bridge.address, forwarder.address], { initializer: 'initializeFunc' })) as Synthesis;
    await synthesis.deployed();
    console.log("Synthesis address:", synthesis.address);

    portalAddress32 = `0x000000000000000000000000${ portal.address.substr(2) }`;
    expect(portalAddress32.length).equal(dumb32.length);

    synthesisAddress32 = `0x000000000000000000000000${ synthesis.address.substr(2) }`;
    expect(synthesisAddress32.length).equal(dumb32.length);

    await bridge.addContractBind(portalAddress32, dumbOppositeBridge, dumbReceiveSide);
    await bridge.addContractBind(synthesisAddress32, dumbOppositeBridge, dumbReceiveSide);
  });

  it("Should emit OracleRequestSolana event from Portal.synthesizeToSolana", async function () {
    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve) => {
      bridge.once("OracleRequestSolana", (...args) => {
        resolve(args[args.length - 1]);
      });  
    });

    const amount = 3.5 * 1000 * 1000;
    const bumpTxState = '53';
    await portal.synthesizeToSolana(dumb, amount, dumbsSynthesize, `0x${ bumpTxState }`, SOLANA_CHAIN_ID);

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
      'e49bdfeca8623673f46d3742d075918c2c0ef558beab0918c344db0aac0a900b', // txId
      bumpTxState,
      'e067350000000000', // amount
    ].join(''));
  });
  
  it("Should emit OracleRequestSolana event from Portal.emergencyUnburnRequestToSolana", async function () {
    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve) => {
      bridge.once("OracleRequestSolana", (...args) => {
        resolve(args[args.length - 1]);
      });  
    });

    await portal.emergencyUnburnRequestToSolana(dumb32, dumbsSynthesize, SOLANA_CHAIN_ID);

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

  it("Should emit OracleRequestSolana event from Synthesis.emergencyUnsyntesizeRequestToSolana", async function () {
    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve) => {
      bridge.once("OracleRequestSolana", (...args) => {
        resolve(args[args.length - 1]);
      });  
    });

    const bumpTxState = '77';
    await synthesis.emergencyUnsyntesizeRequestToSolana(dumbsUnsynthesize, `0x${ bumpTxState }`, SOLANA_CHAIN_ID);

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

  it("Should emit OracleRequestSolana event from Synthesis.burnSyntheticTokenToSolana", async function () {
    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve) => {
      bridge.once("OracleRequestSolana", (...args) => {
        resolve(args[args.length - 1]);
      });  
    });

    const tx = await synthesis.createRepresentation(dumb32, 'TestToken', 'TT');
    const rec = await tx.wait();
    // console.log(rec);
    const evCreatedRepresentation = rec.events?.find(ev => ev.event == 'CreatedRepresentation');
    // console.log(evCreatedRepresentation?.args);
    if( !evCreatedRepresentation ) {
      return;
    }
    const addrSynt = evCreatedRepresentation.args?._stoken;
    // console.log(addrSynt);
    if( !addrSynt ) {
      return;
    }
    // const ERC20 = await ethers.getContractFactory('SyntERC20')
    const SyntERC20  = artifacts.require('SyntERC20');
    const token  = await SyntERC20.at(addrSynt);

    const signer = (await ethers.getSigners())[0].address;
    // console.log(signer);

    await synthesis.setProxyCurve(signer);
    
    const amount = 3.5 * 1000 * 1000;
    await synthesis.mintSyntheticToken(dumb32, dumb, 2*amount, signer);
    // console.log(await token.balanceOf(signer));
    await synthesis.burnSyntheticTokenToSolana(addrSynt, dumbsUnsynthesize, amount, SOLANA_CHAIN_ID);

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
