import { ethers } from 'hardhat';
import { expect } from 'chai';
import { PublicKey as SolanaPublicKey } from '@solana/web3.js';
import {
  Token as SplToken,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BigNumber } from '@ethersproject/bignumber';
import { EthSolWrapper, hex2buf, addr2buf } from '@eywa-fi/eth-solana-wrapper';
import { deploy } from './utils/deploy';

import type { Bridge, Portal, Synthesis } from '@eywa-fi/eth-solana-wrapper';

import type { OracleRequestSolanaEvent } from '../../scripts/bridge-ts/artifacts-types/Bridge';


// uint256 public
const SOLANA_CHAIN_ID = 501501501;
const ALLOW_OWNER_OFF_CURVE = true;

const NilEthAddress = '0x0000000000000000000000000000000000000000';

const sighashEmergencyUnsynthesize = '666b97328dacf43f';
const sighashUnsynthesize = '73ea6f6d83a72546';
const sighashMintSyntheticToken = '2cfd0165828b124e';
const sighashEmergencyUnburn = '9584687b9d5515a1';

const dumb = '0x1234567890123456789012345678901234567890';
const dumb32 = '0x0000000000000000000000001234567890123456789012345678901234567890';
    
const pkReadonly = '0000';
const pkWritable = '0001';
const pkSigner = '0100';
const pkSignerWritable = '0101';
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
  let wrapper: EthSolWrapper;

  before(async () => {
    const config = await deploy();
    
    portalAddress32 = `0x000000000000000000000000${config.portal.substr(2)}`;
    expect(portalAddress32.length).equal(66);

    synthesisAddress32 = `0x000000000000000000000000${config.synthesis.substr(2)}`;
    expect(synthesisAddress32.length).equal(66);

    bridge = (await ethers.getContractFactory("Bridge")).attach(config.bridge);
    portal = (await ethers.getContractFactory("Portal")).attach(config.portal);
    synthesis = (await ethers.getContractFactory("Synthesis")).attach(config.synthesis);

    await bridge.addContractBind(portalAddress32, dumbOppositeBridge, dumbReceiveSide);
    await bridge.addContractBind(synthesisAddress32, dumbOppositeBridge, dumbReceiveSide);

    wrapper = new EthSolWrapper(portal, synthesis, bridge);
  });

  it("prepareRqId", async () => {
    const bufReceiveSide = Buffer.from(dumbReceiveSide.substr(2), 'hex');
    const bufOppositeBridge = Buffer.from(dumbOppositeBridge.substr(2), 'hex');

    const addrSigner = await ethers.provider.getSigner().getAddress();

    const reqId = hex2buf(await bridge.prepareRqId(
      bufOppositeBridge,
      SOLANA_CHAIN_ID,
      bufReceiveSide,
      addr2buf(addrSigner),
      await bridge.getNonce(addrSigner),
    ));

    const thisChainId = 31337;
    const reqId2 = await wrapper.buildRequestId(
      new SolanaPublicKey(bufOppositeBridge),
      new SolanaPublicKey(bufReceiveSide),
      addrSigner,
      thisChainId,
    );

    expect(reqId).deep.equal(reqId2);
  });

  it("Should emit OracleRequestSolana event from Portal.synthesizeToSolana", async function () {
    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve) => {
      bridge.once(
        bridge.filters.OracleRequestSolana(),
        (...args) => {
          resolve(<OracleRequestSolanaEvent>args[args.length - 1]);
        },
      );  
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
      '25000000', // '31000000', // data.length
      sighashMintSyntheticToken,
      // 'e49bdfeca8623673f46d3742d075918c2c0ef558beab0918c344db0aac0a900b', // txId
      bumpTxState,
      dumb.substr(2),
      'e067350000000000', // amount
    ].join(''));
  });

  it("Should emit OracleRequestSolana event from wrapped Portal.synthesizeToSolana", async function () {
    let rejectEventPromise: (reason?: any) => void = () => undefined;

    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve, reject) => {
      rejectEventPromise = reject;
      bridge.once("OracleRequestSolana", (...args) => {
        resolve(args[args.length - 1]);
      });  
    });

    const bufChain2address = Buffer.from(dumbChain2address.substr(2), 'hex');
    const bufReceiveSide = Buffer.from(dumbReceiveSide.substr(2), 'hex');
    const bufOppositeBridge = Buffer.from(dumbOppositeBridge.substr(2), 'hex');

    const pubReceiveSide = new SolanaPublicKey(bufReceiveSide);
    const pubOppositeBridge = new SolanaPublicKey(bufOppositeBridge);

    const pubSyntToken = await wrapper.getSyntTokenAddress(
      hex2buf(dumb),
      pubReceiveSide,
    );

    const amount = 3.5 * 1000 * 1000;
    const [pubTxState, bumpTxState] = await wrapper.findTxStateAddress(
      pubReceiveSide,
      pubSyntToken,
    );
    
    const bufReceiveSideData = (await wrapper.getReceiveSideDataAddress(
      new SolanaPublicKey(bufReceiveSide),
    )).toBuffer();
    const bufSyntToken = (await wrapper.getSyntTokenAddress(
      hex2buf(dumb),
      pubReceiveSide,
    )).toBuffer();
    const bufSyntTokenData = (await wrapper.getSyntTokenDataAddress(
      hex2buf(dumb),
      pubReceiveSide,
    )).toBuffer();
    const pubOppositeBridgeData = await wrapper.getOppositeBridgeDataAddress(
      pubOppositeBridge,
    );

    const addrSigner = await ethers.provider.getSigner().getAddress();

    const reqId = hex2buf(await bridge.prepareRqId(
      bufOppositeBridge,
      SOLANA_CHAIN_ID,
      bufReceiveSide,
      addr2buf(addrSigner),
      await bridge.getNonce(addrSigner),
    ));

    const hexBumpTxState = Buffer.from([bumpTxState]).toString('hex');

    try {
      await wrapper.synthesize(
        dumb,
        BigNumber.from(amount),
        bufChain2address,
        bufReceiveSide,
        bufOppositeBridge,
      );
    } catch (ex) {
      rejectEventPromise(ex);
    }

    const ev = await pEvent;

    expect(ev.event).equals('OracleRequestSolana');
    expect(ev.args.selector.substr(2)).equals([
      '09000000', // accounts.length
      bufReceiveSideData.toString('hex'), pkWritable,
      bufSyntToken.toString('hex'), pkWritable,
      bufSyntTokenData.toString('hex'), pkReadonly,
      pubTxState.toBuffer().toString('hex'), pkWritable,
      dumbChain2address.substr(2), pkWritable,
      pidToken, pkReadonly,
      pidSystem, pkReadonly,
      pidRent, pkReadonly,
      pubOppositeBridgeData.toBuffer().toString('hex'), pkSigner,
      dumbReceiveSide.substr(2), // pid
      '25000000', // '31000000', // data.length
      sighashMintSyntheticToken,
      // reqId.toString('hex'), // txId      
      hexBumpTxState,
      dumb.substr(2),
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
  
  it("Should emit OracleRequestSolana event from wrapped Portal.emergencyUnburnRequestToSolana", async function () {
    let rejectEventPromise: (reason?: any) => void = () => undefined;

    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve, reject) => {
      rejectEventPromise = reject;
      bridge.once("OracleRequestSolana", (...args) => {
        resolve(args[args.length - 1]);
      });  
    });

    const bufTxId = Buffer.from(dumb32.substr(2), 'hex');
    const bufChain2address = Buffer.from(dumbChain2address.substr(2), 'hex');
    const bufReceiveSide = Buffer.from(dumbReceiveSide.substr(2), 'hex');
    const bufOppositeBridge = Buffer.from(dumbOppositeBridge.substr(2), 'hex');

    const pubReceiveSide = new SolanaPublicKey(bufReceiveSide);
    const pubOppositeBridge = new SolanaPublicKey(bufOppositeBridge);

    const pubSyntToken = await wrapper.getSyntTokenAddress(
      hex2buf(dumb),
      pubReceiveSide,
    );

    try {
      await wrapper.emergencyUnburnRequest(
        bufTxId,
        dumb,
        bufChain2address,
        bufReceiveSide,
        bufOppositeBridge,
      );
    } catch (ex) {
      rejectEventPromise(ex);
    }
    
    const ev = await pEvent;
    expect(ev.event).equals('OracleRequestSolana');

    const [pubTxState, bumpTxState] = await wrapper.findTxStateAddress(
      pubReceiveSide,
      pubSyntToken,
    );
    
    const bufReceiveSideData = (await wrapper.getReceiveSideDataAddress(
      new SolanaPublicKey(bufReceiveSide),
    )).toBuffer();
    const bufSyntToken = (await wrapper.getSyntTokenAddress(
      hex2buf(dumb),
      pubReceiveSide,
    )).toBuffer();
    const bufSyntTokenData = (await wrapper.getSyntTokenDataAddress(
      hex2buf(dumb),
      pubReceiveSide,
    )).toBuffer();
    const pubOppositeBridgeData = await wrapper.getOppositeBridgeDataAddress(
      pubOppositeBridge,
    );

    expect(ev.args.selector.substr(2)).equals([
      '07000000', // accounts.length
      bufReceiveSideData.toString('hex'), pkReadonly,
      pubTxState.toBuffer().toString('hex'), pkWritable,
      bufSyntToken.toString('hex'), pkWritable,
      bufSyntTokenData.toString('hex'), pkReadonly,
      dumbChain2address.substr(2), pkWritable,
      pidToken, pkReadonly,
      pubOppositeBridgeData.toBuffer().toString('hex'), pkSigner,
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
      dumbOppositeBridgeData.substr(2), pkSignerWritable,
      pidToken, pkReadonly,
      dumbReceiveSide.substr(2), // pid
      '09000000', // data.length
      sighashEmergencyUnsynthesize,
      bumpTxState,
    ].join(''));
  });

  it("Should emit OracleRequestSolana event from wrapped Synthesis.emergencyUnsyntesizeRequestToSolana", async function () {
    let rejectEventPromise: (reason?: any) => void = () => undefined;

    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve, reject) => {
      rejectEventPromise = reject;
      bridge.once("OracleRequestSolana", (...args) => {
        resolve(args[args.length - 1]);
      });  
    });

    const bufRealToken = Buffer.from(dumb32.substr(2), 'hex');
    const bufChain2address = Buffer.from(dumbChain2address.substr(2), 'hex');
    const bufReceiveSide = Buffer.from(dumbReceiveSide.substr(2), 'hex');
    const bufOppositeBridge = Buffer.from(dumbOppositeBridge.substr(2), 'hex');

    const pubReceiveSide = new SolanaPublicKey(bufReceiveSide);
    const pubOppositeBridge = new SolanaPublicKey(bufOppositeBridge);

    try {
      await wrapper.emergencyUnsyntesizeRequest(
        bufRealToken,
        bufChain2address,
        bufReceiveSide,
        bufOppositeBridge,
      );
    } catch (ex) {
      rejectEventPromise(ex);
    }

    const ev = await pEvent;
    expect(ev.event).equals('OracleRequestSolana');

    const pubRealToken = new SolanaPublicKey(bufRealToken);
    const [pubTxState, bumpTxState] = await wrapper.findTxStateAddress(
      pubReceiveSide,
      pubRealToken,
    );
    
    const bufReceiveSideData = (await wrapper.getReceiveSideDataAddress(
      new SolanaPublicKey(bufReceiveSide),
    )).toBuffer();

    const pubOppositeBridgeData = await wrapper.getOppositeBridgeDataAddress(
      pubOppositeBridge,
    );

    expect(ev.args.selector.substr(2)).equals([
      '07000000', // accounts.length
      bufReceiveSideData.toString('hex'), pkReadonly,
      pubTxState.toBuffer().toString('hex'), pkWritable,
      bufRealToken.toString('hex'), pkReadonly,
      dumbChain2address.substr(2), pkWritable,
      dumbChain2address.substr(2), pkWritable,
      pubOppositeBridgeData.toBuffer().toString('hex'), pkSignerWritable,
      pidToken, pkReadonly,
      dumbReceiveSide.substr(2), // pid
      '09000000', // data.length
      sighashEmergencyUnsynthesize,
      bumpTxState.toString(16),
    ].join(''));
  });

  const getOrCreateRepresentationAddress = async (realToken: string): Promise<string> => {
    let addrSynt = await synthesis.getRepresentation(realToken);
    if ( NilEthAddress != addrSynt ) {
      return addrSynt;
    }

    const tx = await synthesis.createRepresentation(realToken, 18, 'TestToken', 'TT', SOLANA_CHAIN_ID, 'GACHE');
    const rec = await tx.wait();

    const evCreatedRepresentation = rec.events?.find(ev => ev.event == 'CreatedRepresentation');
    if( !evCreatedRepresentation ) {
      throw new Error('Unable to create representation: CreatedRepresentation event not found');
    }

    addrSynt = evCreatedRepresentation.args?._stoken;
    if( !addrSynt ) {
      throw new Error('Unable to create representation: _stoken address not found');
    }

    return addrSynt;
  };

  it("Should emit OracleRequestSolana event from Synthesis.burnSyntheticTokenToSolana", async function () {
    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve) => {
      bridge.once("OracleRequestSolana", (...args) => {
        resolve(args[args.length - 1]);
      });  
    });

    const addrSynt = await getOrCreateRepresentationAddress(dumb32);

    const signer = (await ethers.getSigners())[0].address;
    await synthesis.setProxyCurve(signer);

    const bufReceiveSide = Buffer.from(dumbReceiveSide.substr(2), 'hex');
    const bufOppositeBridge = Buffer.from(dumbOppositeBridge.substr(2), 'hex');

    const addrSigner = await ethers.provider.getSigner().getAddress();
    const reqId = hex2buf(await bridge.prepareRqId(
      bufOppositeBridge,
      SOLANA_CHAIN_ID,
      bufReceiveSide,
      addr2buf(addrSigner),
      await bridge.getNonce(addrSigner),
    ));

    const amount = 3.5 * 1000 * 1000;
    await synthesis.mintSyntheticToken(dumb32, dumb, 2*amount, signer);
    const bump = '53';
    await synthesis.burnSyntheticTokenToSolana(addrSynt, dumbsUnsynthesize, `0x${ bump }`, amount, SOLANA_CHAIN_ID);

    const ev = await pEvent;
    expect(ev.event).equals('OracleRequestSolana');

    expect(ev.args.selector.substr(2)).equals([
      '0a000000', // accounts.length
      dumbReceiveSideData.substr(2), pkReadonly,
      dumbRealToken.substr(2), pkReadonly,
      reqId.toString('hex'), pkReadonly,
      dumbTxState.substr(2), pkWritable,
      dumbSource.substr(2), pkWritable,
      dumbDestination.substr(2), pkWritable,
      dumbOppositeBridgeData.substr(2), pkSignerWritable,
      pidToken, pkReadonly,
      pidRent, pkReadonly,
      pidSystem, pkReadonly,
      dumbReceiveSide.substr(2),
      '11000000', // data.length
      sighashUnsynthesize,
      bump,
      'e067350000000000', // amount
    ].join(''));
  });

  it("Should emit OracleRequestSolana event from wrapped Synthesis.burnSyntheticTokenToSolana", async function () {
    let rejectEventPromise: (reason?: any) => void = () => undefined;

    const pEvent: Promise<OracleRequestSolanaEvent> = new Promise((resolve, reject) => {
      rejectEventPromise = reject;
      bridge.once("OracleRequestSolana", (...args) => {
        resolve(args[args.length - 1]);
      });  
    });

    const addrSynt = await getOrCreateRepresentationAddress(dumb32);

    const bufRealToken = Buffer.from(dumb32.substr(2), 'hex');
    const bufChain2address = Buffer.from(dumbChain2address.substr(2), 'hex');
    const bufReceiveSide = Buffer.from(dumbReceiveSide.substr(2), 'hex');
    const bufOppositeBridge = Buffer.from(dumbOppositeBridge.substr(2), 'hex');

    const pubReceiveSide = new SolanaPublicKey(bufReceiveSide);
    const pubOppositeBridge = new SolanaPublicKey(bufOppositeBridge);
    const pubRealToken = new SolanaPublicKey(bufRealToken);
    const pubChain2address = new SolanaPublicKey(bufChain2address);

    const addrSigner = await ethers.provider.getSigner().getAddress();
    const reqId = hex2buf(await bridge.prepareRqId(
      bufOppositeBridge,
      SOLANA_CHAIN_ID,
      bufReceiveSide,
      addr2buf(addrSigner),
      await bridge.getNonce(addrSigner),
    ));

    const amount = 3.5 * 1000 * 1000;
    try {
      await wrapper.burnSyntheticToken(
        addrSynt,
        bufRealToken,
        BigNumber.from(amount),
        bufChain2address,
        bufReceiveSide,
        bufOppositeBridge,
      );
    } catch (ex) {
      rejectEventPromise(ex);
    }

    const ev = await pEvent;
    expect(ev.event).equals('OracleRequestSolana');

    const [pubTxState, bumpTxState] = await wrapper.findTxStateAddress(
      pubReceiveSide,
      pubRealToken,
    );
    
    const bufReceiveSideData = (await wrapper.getReceiveSideDataAddress(
      new SolanaPublicKey(bufReceiveSide),
    )).toBuffer();

    const pubOppositeBridgeData = await wrapper.getOppositeBridgeDataAddress(
      pubOppositeBridge,
    );

    const pubReceiveSideData = await wrapper.getReceiveSideDataAddress(pubReceiveSide);

    const walUser = await SplToken.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      pubRealToken,
      pubChain2address,
    );

    const walPDA = await SplToken.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      pubRealToken,
      pubReceiveSideData,
      ALLOW_OWNER_OFF_CURVE,
    );

    const hexBumpTxState = Buffer.from([bumpTxState]).toString('hex');
    expect(ev.args.selector.substr(2)).equals([
      '0a000000', // accounts.length
      bufReceiveSideData.toString('hex'), pkReadonly,
      bufRealToken.toString('hex'), pkReadonly,
      reqId.toString('hex'), pkReadonly,
      pubTxState.toBuffer().toString('hex'), pkWritable,
      walPDA.toBuffer().toString('hex'), pkWritable,
      walUser.toBuffer().toString('hex'), pkWritable,
      pubOppositeBridgeData.toBuffer().toString('hex'), pkSignerWritable,
      pidToken, pkReadonly,
      pidRent, pkReadonly,
      pidSystem, pkReadonly,
      dumbReceiveSide.substr(2), // pid
      '11000000', // data.length
      sighashUnsynthesize,
      hexBumpTxState,
      'e067350000000000', // amount
    ].join(''));
  });

});
