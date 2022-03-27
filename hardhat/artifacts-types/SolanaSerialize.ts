/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  BaseContract,
  BigNumber,
  BytesLike,
  CallOverrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import { FunctionFragment, Result } from "@ethersproject/abi";
import { Listener, Provider } from "@ethersproject/providers";
import { TypedEventFilter, TypedEvent, TypedListener, OnEvent } from "./common";

export type SolanaAccountMetaStruct = {
  pubkey: BytesLike;
  isSigner: boolean;
  isWritable: boolean;
};

export type SolanaAccountMetaStructOutput = [string, boolean, boolean] & {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
};

export type SolanaStandaloneInstructionStruct = {
  programId: BytesLike;
  accounts: SolanaAccountMetaStruct[];
  data: BytesLike;
};

export type SolanaStandaloneInstructionStructOutput = [
  string,
  SolanaAccountMetaStructOutput[],
  string
] & {
  programId: string;
  accounts: SolanaAccountMetaStructOutput[];
  data: string;
};

export interface SolanaSerializeInterface extends utils.Interface {
  functions: {
    "SOLANA_CHAIN_ID()": FunctionFragment;
    "SOLANA_RENT()": FunctionFragment;
    "SOLANA_SYSTEM_PROGRAM()": FunctionFragment;
    "SOLANA_TOKEN_PROGRAM()": FunctionFragment;
    "serializeSolanaStandaloneInstruction((bytes32,(bytes32,bool,bool)[],bytes))": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "SOLANA_CHAIN_ID",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "SOLANA_RENT",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "SOLANA_SYSTEM_PROGRAM",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "SOLANA_TOKEN_PROGRAM",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "serializeSolanaStandaloneInstruction",
    values: [SolanaStandaloneInstructionStruct]
  ): string;

  decodeFunctionResult(
    functionFragment: "SOLANA_CHAIN_ID",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "SOLANA_RENT",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "SOLANA_SYSTEM_PROGRAM",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "SOLANA_TOKEN_PROGRAM",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "serializeSolanaStandaloneInstruction",
    data: BytesLike
  ): Result;

  events: {};
}

export interface SolanaSerialize extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: SolanaSerializeInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    SOLANA_CHAIN_ID(overrides?: CallOverrides): Promise<[BigNumber]>;

    "SOLANA_CHAIN_ID()"(overrides?: CallOverrides): Promise<[BigNumber]>;

    SOLANA_RENT(overrides?: CallOverrides): Promise<[string]>;

    "SOLANA_RENT()"(overrides?: CallOverrides): Promise<[string]>;

    SOLANA_SYSTEM_PROGRAM(overrides?: CallOverrides): Promise<[string]>;

    "SOLANA_SYSTEM_PROGRAM()"(overrides?: CallOverrides): Promise<[string]>;

    SOLANA_TOKEN_PROGRAM(overrides?: CallOverrides): Promise<[string]>;

    "SOLANA_TOKEN_PROGRAM()"(overrides?: CallOverrides): Promise<[string]>;

    serializeSolanaStandaloneInstruction(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<[string]>;

    "serializeSolanaStandaloneInstruction((bytes32,(bytes32,bool,bool)[],bytes))"(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<[string]>;
  };

  SOLANA_CHAIN_ID(overrides?: CallOverrides): Promise<BigNumber>;

  "SOLANA_CHAIN_ID()"(overrides?: CallOverrides): Promise<BigNumber>;

  SOLANA_RENT(overrides?: CallOverrides): Promise<string>;

  "SOLANA_RENT()"(overrides?: CallOverrides): Promise<string>;

  SOLANA_SYSTEM_PROGRAM(overrides?: CallOverrides): Promise<string>;

  "SOLANA_SYSTEM_PROGRAM()"(overrides?: CallOverrides): Promise<string>;

  SOLANA_TOKEN_PROGRAM(overrides?: CallOverrides): Promise<string>;

  "SOLANA_TOKEN_PROGRAM()"(overrides?: CallOverrides): Promise<string>;

  serializeSolanaStandaloneInstruction(
    ix: SolanaStandaloneInstructionStruct,
    overrides?: CallOverrides
  ): Promise<string>;

  "serializeSolanaStandaloneInstruction((bytes32,(bytes32,bool,bool)[],bytes))"(
    ix: SolanaStandaloneInstructionStruct,
    overrides?: CallOverrides
  ): Promise<string>;

  callStatic: {
    SOLANA_CHAIN_ID(overrides?: CallOverrides): Promise<BigNumber>;

    "SOLANA_CHAIN_ID()"(overrides?: CallOverrides): Promise<BigNumber>;

    SOLANA_RENT(overrides?: CallOverrides): Promise<string>;

    "SOLANA_RENT()"(overrides?: CallOverrides): Promise<string>;

    SOLANA_SYSTEM_PROGRAM(overrides?: CallOverrides): Promise<string>;

    "SOLANA_SYSTEM_PROGRAM()"(overrides?: CallOverrides): Promise<string>;

    SOLANA_TOKEN_PROGRAM(overrides?: CallOverrides): Promise<string>;

    "SOLANA_TOKEN_PROGRAM()"(overrides?: CallOverrides): Promise<string>;

    serializeSolanaStandaloneInstruction(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<string>;

    "serializeSolanaStandaloneInstruction((bytes32,(bytes32,bool,bool)[],bytes))"(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<string>;
  };

  filters: {};

  estimateGas: {
    SOLANA_CHAIN_ID(overrides?: CallOverrides): Promise<BigNumber>;

    "SOLANA_CHAIN_ID()"(overrides?: CallOverrides): Promise<BigNumber>;

    SOLANA_RENT(overrides?: CallOverrides): Promise<BigNumber>;

    "SOLANA_RENT()"(overrides?: CallOverrides): Promise<BigNumber>;

    SOLANA_SYSTEM_PROGRAM(overrides?: CallOverrides): Promise<BigNumber>;

    "SOLANA_SYSTEM_PROGRAM()"(overrides?: CallOverrides): Promise<BigNumber>;

    SOLANA_TOKEN_PROGRAM(overrides?: CallOverrides): Promise<BigNumber>;

    "SOLANA_TOKEN_PROGRAM()"(overrides?: CallOverrides): Promise<BigNumber>;

    serializeSolanaStandaloneInstruction(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    "serializeSolanaStandaloneInstruction((bytes32,(bytes32,bool,bool)[],bytes))"(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    SOLANA_CHAIN_ID(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "SOLANA_CHAIN_ID()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    SOLANA_RENT(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "SOLANA_RENT()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    SOLANA_SYSTEM_PROGRAM(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "SOLANA_SYSTEM_PROGRAM()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    SOLANA_TOKEN_PROGRAM(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "SOLANA_TOKEN_PROGRAM()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    serializeSolanaStandaloneInstruction(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "serializeSolanaStandaloneInstruction((bytes32,(bytes32,bool,bool)[],bytes))"(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}