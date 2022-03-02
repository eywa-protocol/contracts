import sha3 from "js-sha3";
import * as web3 from '@solana/web3.js';
import {
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BigNumber } from '@ethersproject/bignumber';
import { bufferToHex } from 'ethereumjs-util';

import type { Portal } from './artifacts-types/Portal';
import type { Synthesis } from './artifacts-types/Synthesis';
import type { Bridge } from './artifacts-types/Bridge';

export const SOLANA_CHAIN_ID = 501501501;
const ALLOW_OWNER_OFF_CURVE = true;

export type { Portal } from './artifacts-types/Portal';
export type { Synthesis } from './artifacts-types/Synthesis';

const seedMint = Buffer.from("mint-synt", "utf-8");
const seedData = Buffer.from("mint-data", "utf-8");
const seedPDA = Buffer.from("eywa-pda", "utf-8");
const seedTxState = Buffer.from("eywa-tx-state", "utf-8");


export type THexString = string;
export type TAddress = THexString;
export type UInt160 = Buffer;
export type TPubkey = Buffer;

export const bufPadLeftTo = (buf: Buffer, sizeToBytes: number): Buffer => {
  if ( sizeToBytes < buf.length ) {
    throw new Error('Source Bufer oversized');
  }
  return Buffer.concat([
    Buffer.alloc(sizeToBytes - buf.length),
    buf,
  ]);
}

export const trim0x = (hex: THexString): THexString =>
  hex.startsWith('0x') ? hex.substr(2) : hex;

export const hex2buf = (hex: THexString): TPubkey =>
  Buffer.from(trim0x(hex), 'hex');

export const addr2buf = (addr: TAddress): TPubkey =>
  bufPadLeftTo(hex2buf(addr), 32);
  // hex2buf(`0x000000000000000000000000${ trim0x(addr) }`);


export class EthSolWrapper {
  
  constructor(
    private portal: Portal,
    private synthesis: Synthesis,
    private bridge: Bridge,
  ) {
    //
  }

  async buildRequestId(
    pubOppositeBridge: web3.PublicKey,
    pubReceiveSide: web3.PublicKey,
    from: TAddress,
    fromChainId: number,
  ): Promise<TPubkey> {
    const nonce = await this.bridge.getNonce(from);
    console.log(nonce);
    // console.log(BigNumber.from(nonce.toString()));
    // console.log(BigNumber.from(nonce).toHexString());
    
    const data = [
      addr2buf(from),
      hex2buf(BigNumber.from(nonce.toString()).toHexString()),
      hex2buf(BigNumber.from(SOLANA_CHAIN_ID).toHexString()),
      // block.chainid
      hex2buf(BigNumber.from(fromChainId).toHexString()),
      pubReceiveSide.toBuffer(),
      pubOppositeBridge.toBuffer(),
    ].map(b => bufPadLeftTo(b, 32));

    return Buffer.from(sha3.keccak_256(Buffer.concat(data)), 'hex');
  }

  async findTxStateAddress(
    pubReceiveSide: web3.PublicKey,
    pubToken: web3.PublicKey,
  ): Promise<[web3.PublicKey, number]> {
    return web3.PublicKey.findProgramAddress(
      [seedTxState, pubToken.toBuffer()],
      pubReceiveSide,
    );
  }

  async getTxStateAddress(
    pubReceiveSide: web3.PublicKey,
    txId: TPubkey,
  ): Promise<web3.PublicKey> {
    const [pub, _bump] = await web3.PublicKey.findProgramAddress([seedTxState, txId], pubReceiveSide);
    return pub;
  }

  async getReceiveSideDataAddress(pubReceiveSide: web3.PublicKey): Promise<web3.PublicKey> {
    const [pub, _bump] = await web3.PublicKey.findProgramAddress([seedPDA], pubReceiveSide);
    return pub;
  }

  async getOppositeBridgeDataAddress(pubOppositeBridge: web3.PublicKey): Promise<web3.PublicKey> {
    const [pub, _bump] = await web3.PublicKey.findProgramAddress([seedPDA], pubOppositeBridge);
    return pub;
  }

  async getSyntTokenAddress(
    realToken: UInt160,
    pubReceiveSide: web3.PublicKey
  ): Promise<web3.PublicKey> {
    const [pub, _bump] = await web3.PublicKey.findProgramAddress([seedMint, realToken], pubReceiveSide);
    return pub;
  }

  async getSyntTokenDataAddress(
    realToken: UInt160,
    pubReceiveSide: web3.PublicKey
  ): Promise<web3.PublicKey> {
    const [pub, _bump] = await web3.PublicKey.findProgramAddress([seedData, realToken], pubReceiveSide);
    return pub;
  }

  async synthesize(
    token: TAddress,
    amount: BigNumber,
    bufChain2address: TPubkey,
    bufReceiveSide: TPubkey,
    bufOppositeBridge: TPubkey,
  ) {
    const pubReceiveSide = new web3.PublicKey(bufReceiveSide);
    const pubOppositeBridge = new web3.PublicKey(bufOppositeBridge);
    const realToken: UInt160 = Buffer.from(token.substr(2), 'hex');

    const pubReceiveSideData = await this.getReceiveSideDataAddress(pubReceiveSide);
    const pubOppositeBridgeData = await this.getOppositeBridgeDataAddress(pubOppositeBridge);
    const pubSyntToken = await this.getSyntTokenAddress(realToken, pubReceiveSide);
    const pubSyntTokenData = await this.getSyntTokenDataAddress(realToken, pubReceiveSide);
    const [pubTxState, bumpTxState] = await this.findTxStateAddress(pubReceiveSide, pubSyntToken);

    const pubkeys = [
      bufChain2address,
      bufReceiveSide,
      pubReceiveSideData.toBuffer(),
      bufOppositeBridge,
      pubOppositeBridgeData.toBuffer(),
      pubSyntToken.toBuffer(),
      pubSyntTokenData.toBuffer(),
      pubTxState.toBuffer(),
    ];

    // console.log('pubkeys');
    // pubkeys.forEach(buf => console.log(buf.toString('hex')));

    return this.portal.synthesizeToSolana(token, amount, pubkeys, Buffer.from([bumpTxState]), SOLANA_CHAIN_ID);
  }

  async emergencyUnburnRequest(
    txId: TPubkey,
    token: TAddress,
    bufChain2address: TPubkey,
    bufReceiveSide: TPubkey,
    bufOppositeBridge: TPubkey,
  ) {
    const pubReceiveSide = new web3.PublicKey(bufReceiveSide);
    const pubOppositeBridge = new web3.PublicKey(bufOppositeBridge);
    const realToken: UInt160 = Buffer.from(token.substr(2), 'hex');

    const pubReceiveSideData = await this.getReceiveSideDataAddress(pubReceiveSide);
    const pubOppositeBridgeData = await this.getOppositeBridgeDataAddress(pubOppositeBridge);

    // const pubReceiveSideData = await this.getReceiveSideDataAddress(pubReceiveSide);
    // const pubOppositeBridgeData = await this.getOppositeBridgeDataAddress(pubOppositeBridge);
    const pubSyntToken = await this.getSyntTokenAddress(realToken, pubReceiveSide);
    const pubSyntTokenData = await this.getSyntTokenDataAddress(realToken, pubReceiveSide);
    const [pubTxState, _] = await this.findTxStateAddress(pubReceiveSide, pubSyntToken);

    const pubkeys = [
      bufChain2address,
      bufReceiveSide,
      pubReceiveSideData.toBuffer(),
      bufOppositeBridge,
      pubOppositeBridgeData.toBuffer(),
      pubSyntToken.toBuffer(),
      pubSyntTokenData.toBuffer(),
      pubTxState.toBuffer(),
    ];
    
    return this.portal.emergencyUnburnRequestToSolana(txId, pubkeys, SOLANA_CHAIN_ID);
  }

  async emergencyUnsyntesizeRequest(
    // txId: TPubkey,
    bufRealToken: TPubkey,
    bufChain2address: TPubkey,
    bufReceiveSide: TPubkey,
    bufOppositeBridge: TPubkey,
  ) {
    const pubReceiveSide = new web3.PublicKey(bufReceiveSide);
    const pubOppositeBridge = new web3.PublicKey(bufOppositeBridge);

    const pubReceiveSideData = await this.getReceiveSideDataAddress(pubReceiveSide);
    const pubOppositeBridgeData = await this.getOppositeBridgeDataAddress(pubOppositeBridge);
    const [pubTxState, bumpTxState] = await this.findTxStateAddress(pubReceiveSide, new web3.PublicKey(bufRealToken));
    
    const pubkeys = [
      bufReceiveSide,
      pubReceiveSideData.toBuffer(),
      bufOppositeBridge,
      pubOppositeBridgeData.toBuffer(),
      pubTxState.toBuffer(),
      bufChain2address, // source,
      bufChain2address, // destination,
      bufRealToken,
    ];
    
    return this.synthesis.emergencyUnsyntesizeRequestToSolana(pubkeys, bufferToHex(Buffer.from([bumpTxState])), SOLANA_CHAIN_ID);
  }

  async burnSyntheticToken(
    token: TAddress,
    bufRealToken: TPubkey,
    amount: BigNumber,
    bufChain2address: TPubkey,
    bufReceiveSide: TPubkey,
    bufOppositeBridge: TPubkey,
  ) {
    const pubReceiveSide = new web3.PublicKey(bufReceiveSide);
    const pubOppositeBridge = new web3.PublicKey(bufOppositeBridge);
    const pubRealToken = new web3.PublicKey(bufRealToken);
    const pubChain2address = new web3.PublicKey(bufChain2address);

    const pubReceiveSideData = await this.getReceiveSideDataAddress(pubReceiveSide);
    const pubOppositeBridgeData = await this.getOppositeBridgeDataAddress(pubOppositeBridge);
    const [pubTxState, bumpTxState] = await this.findTxStateAddress(pubReceiveSide, new web3.PublicKey(bufRealToken));

    const walUser = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      pubRealToken,
      pubChain2address,
    );

    const walPDA = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      pubRealToken,
      pubReceiveSideData,
      ALLOW_OWNER_OFF_CURVE,
    );

    const pubkeys = [
      bufReceiveSide,
      pubReceiveSideData.toBuffer(),
      bufOppositeBridge,
      pubOppositeBridgeData.toBuffer(),
      pubTxState.toBuffer(),
      walPDA.toBuffer(),
      walUser.toBuffer(),
      bufRealToken,
    ];
    // console.log(pubkeys);

    return this.synthesis.burnSyntheticTokenToSolana(
      token,
      pubkeys,
      Buffer.from([bumpTxState]), // `0x${ bumpTxState }`,
      amount,
      SOLANA_CHAIN_ID,
    );
  }
}
