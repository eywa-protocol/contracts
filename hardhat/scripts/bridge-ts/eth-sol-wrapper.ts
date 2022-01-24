import * as web3 from '@solana/web3.js';

import type { BigNumber } from '@ethersproject/bignumber';
import type { Portal } from '../../artifacts-types/Portal';
import type { Synthesis } from '../../artifacts-types/Synthesis';

export const SOLANA_CHAIN_ID = 501501501;

export type { Portal } from '../../artifacts-types/Portal';
export type { Synthesis } from '../../artifacts-types/Synthesis';

const seedMint = Buffer.from("mint-synt", "utf-8");
const seedData = Buffer.from("mint-data", "utf-8");
const seedPDA = Buffer.from("eywa-pda", "utf-8");
const seedTxState = Buffer.from("eywa-tx-state", "utf-8");


export type TAddress = string;
export type UInt160 = Buffer;
export type TPubkey = Buffer;

export class EthSolWrapper {
  
  constructor(
    private portal: Portal,
    private synthesis: Synthesis,
  ) {
    //
  }

  async findTxStateAddress(
    pubReceiveSide: web3.PublicKey,
    pubToken: web3.PublicKey,
  ): Promise<[web3.PublicKey, number]> {
    return web3.PublicKey.findProgramAddress([seedTxState, pubToken.toBuffer()], pubReceiveSide);
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

    return this.portal.synthesizeToSolana(token, amount, pubkeys, Buffer.from([bumpTxState]), SOLANA_CHAIN_ID);
  }

  async emergencyUnburnRequest(
    txId: TPubkey,
    bufChain2address: TPubkey,
    bufReceiveSide: TPubkey,
    bufOppositeBridge: TPubkey,
  ) {
    const pubReceiveSide = new web3.PublicKey(bufReceiveSide);
    const pubOppositeBridge = new web3.PublicKey(bufOppositeBridge);

    const pubReceiveSideData = await this.getReceiveSideDataAddress(pubReceiveSide);
    const pubOppositeBridgeData = await this.getOppositeBridgeDataAddress(pubOppositeBridge);

    const pubkeys = [
      bufChain2address,
      bufReceiveSide,
      pubReceiveSideData.toBuffer(),
      bufOppositeBridge,
      pubOppositeBridgeData.toBuffer(),
    ];

    return this.portal.emergencyUnburnRequestToSolana(txId, pubkeys, SOLANA_CHAIN_ID);
  }

  async emergencyUnsyntesizeRequest(
    txId: TPubkey,
    bufChain2address: TPubkey,
    bufReceiveSide: TPubkey,
    bufOppositeBridge: TPubkey,
  ) {
    const pubReceiveSide = new web3.PublicKey(bufReceiveSide);
    const pubOppositeBridge = new web3.PublicKey(bufOppositeBridge);

    const pubReceiveSideData = await this.getReceiveSideDataAddress(pubReceiveSide);
    const pubOppositeBridgeData = await this.getOppositeBridgeDataAddress(pubOppositeBridge);
    const pubTxState = await this.getTxStateAddress(pubReceiveSide, txId);
    
    const pubkeys = [
      bufReceiveSide,
      pubReceiveSideData.toBuffer(),
      bufOppositeBridge,
      pubOppositeBridgeData.toBuffer(),
      pubTxState.toBuffer(),
      bufChain2address, // destination,
    ];
    

    const bumpTxState = 0;
    return this.synthesis.emergencyUnsyntesizeRequestToSolana(pubkeys, `0x${ bumpTxState }`, SOLANA_CHAIN_ID);
  }

  async burnSyntheticToken(
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
    const [pubTxState, bumpTxState] = await this.findTxStateAddress(pubReceiveSide, pubSyntToken);

    const pubkeys = [
      bufReceiveSide,
      pubReceiveSideData.toBuffer(),
      bufOppositeBridge,
      pubOppositeBridgeData.toBuffer(),
      pubTxState.toBuffer(),
      bufChain2address, // destination,
    ];
    

    return this.synthesis.burnSyntheticTokenToSolana(token, pubkeys, amount, SOLANA_CHAIN_ID);
  }
    
}
