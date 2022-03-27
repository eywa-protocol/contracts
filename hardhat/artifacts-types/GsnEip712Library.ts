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

export interface GsnEip712LibraryInterface extends utils.Interface {
  functions: {
    "EIP712DOMAIN_TYPEHASH()": FunctionFragment;
    "GENERIC_PARAMS()": FunctionFragment;
    "RELAYDATA_TYPE()": FunctionFragment;
    "RELAYDATA_TYPEHASH()": FunctionFragment;
    "RELAY_REQUEST_NAME()": FunctionFragment;
    "RELAY_REQUEST_SUFFIX()": FunctionFragment;
    "RELAY_REQUEST_TYPE()": FunctionFragment;
    "RELAY_REQUEST_TYPEHASH()": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "EIP712DOMAIN_TYPEHASH",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "GENERIC_PARAMS",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "RELAYDATA_TYPE",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "RELAYDATA_TYPEHASH",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "RELAY_REQUEST_NAME",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "RELAY_REQUEST_SUFFIX",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "RELAY_REQUEST_TYPE",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "RELAY_REQUEST_TYPEHASH",
    values?: undefined
  ): string;

  decodeFunctionResult(
    functionFragment: "EIP712DOMAIN_TYPEHASH",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "GENERIC_PARAMS",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "RELAYDATA_TYPE",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "RELAYDATA_TYPEHASH",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "RELAY_REQUEST_NAME",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "RELAY_REQUEST_SUFFIX",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "RELAY_REQUEST_TYPE",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "RELAY_REQUEST_TYPEHASH",
    data: BytesLike
  ): Result;

  events: {};
}

export interface GsnEip712Library extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: GsnEip712LibraryInterface;

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
    EIP712DOMAIN_TYPEHASH(overrides?: CallOverrides): Promise<[string]>;

    "EIP712DOMAIN_TYPEHASH()"(overrides?: CallOverrides): Promise<[string]>;

    GENERIC_PARAMS(overrides?: CallOverrides): Promise<[string]>;

    "GENERIC_PARAMS()"(overrides?: CallOverrides): Promise<[string]>;

    RELAYDATA_TYPE(overrides?: CallOverrides): Promise<[string]>;

    "RELAYDATA_TYPE()"(overrides?: CallOverrides): Promise<[string]>;

    RELAYDATA_TYPEHASH(overrides?: CallOverrides): Promise<[string]>;

    "RELAYDATA_TYPEHASH()"(overrides?: CallOverrides): Promise<[string]>;

    RELAY_REQUEST_NAME(overrides?: CallOverrides): Promise<[string]>;

    "RELAY_REQUEST_NAME()"(overrides?: CallOverrides): Promise<[string]>;

    RELAY_REQUEST_SUFFIX(overrides?: CallOverrides): Promise<[string]>;

    "RELAY_REQUEST_SUFFIX()"(overrides?: CallOverrides): Promise<[string]>;

    RELAY_REQUEST_TYPE(overrides?: CallOverrides): Promise<[string]>;

    "RELAY_REQUEST_TYPE()"(overrides?: CallOverrides): Promise<[string]>;

    RELAY_REQUEST_TYPEHASH(overrides?: CallOverrides): Promise<[string]>;

    "RELAY_REQUEST_TYPEHASH()"(overrides?: CallOverrides): Promise<[string]>;
  };

  EIP712DOMAIN_TYPEHASH(overrides?: CallOverrides): Promise<string>;

  "EIP712DOMAIN_TYPEHASH()"(overrides?: CallOverrides): Promise<string>;

  GENERIC_PARAMS(overrides?: CallOverrides): Promise<string>;

  "GENERIC_PARAMS()"(overrides?: CallOverrides): Promise<string>;

  RELAYDATA_TYPE(overrides?: CallOverrides): Promise<string>;

  "RELAYDATA_TYPE()"(overrides?: CallOverrides): Promise<string>;

  RELAYDATA_TYPEHASH(overrides?: CallOverrides): Promise<string>;

  "RELAYDATA_TYPEHASH()"(overrides?: CallOverrides): Promise<string>;

  RELAY_REQUEST_NAME(overrides?: CallOverrides): Promise<string>;

  "RELAY_REQUEST_NAME()"(overrides?: CallOverrides): Promise<string>;

  RELAY_REQUEST_SUFFIX(overrides?: CallOverrides): Promise<string>;

  "RELAY_REQUEST_SUFFIX()"(overrides?: CallOverrides): Promise<string>;

  RELAY_REQUEST_TYPE(overrides?: CallOverrides): Promise<string>;

  "RELAY_REQUEST_TYPE()"(overrides?: CallOverrides): Promise<string>;

  RELAY_REQUEST_TYPEHASH(overrides?: CallOverrides): Promise<string>;

  "RELAY_REQUEST_TYPEHASH()"(overrides?: CallOverrides): Promise<string>;

  callStatic: {
    EIP712DOMAIN_TYPEHASH(overrides?: CallOverrides): Promise<string>;

    "EIP712DOMAIN_TYPEHASH()"(overrides?: CallOverrides): Promise<string>;

    GENERIC_PARAMS(overrides?: CallOverrides): Promise<string>;

    "GENERIC_PARAMS()"(overrides?: CallOverrides): Promise<string>;

    RELAYDATA_TYPE(overrides?: CallOverrides): Promise<string>;

    "RELAYDATA_TYPE()"(overrides?: CallOverrides): Promise<string>;

    RELAYDATA_TYPEHASH(overrides?: CallOverrides): Promise<string>;

    "RELAYDATA_TYPEHASH()"(overrides?: CallOverrides): Promise<string>;

    RELAY_REQUEST_NAME(overrides?: CallOverrides): Promise<string>;

    "RELAY_REQUEST_NAME()"(overrides?: CallOverrides): Promise<string>;

    RELAY_REQUEST_SUFFIX(overrides?: CallOverrides): Promise<string>;

    "RELAY_REQUEST_SUFFIX()"(overrides?: CallOverrides): Promise<string>;

    RELAY_REQUEST_TYPE(overrides?: CallOverrides): Promise<string>;

    "RELAY_REQUEST_TYPE()"(overrides?: CallOverrides): Promise<string>;

    RELAY_REQUEST_TYPEHASH(overrides?: CallOverrides): Promise<string>;

    "RELAY_REQUEST_TYPEHASH()"(overrides?: CallOverrides): Promise<string>;
  };

  filters: {};

  estimateGas: {
    EIP712DOMAIN_TYPEHASH(overrides?: CallOverrides): Promise<BigNumber>;

    "EIP712DOMAIN_TYPEHASH()"(overrides?: CallOverrides): Promise<BigNumber>;

    GENERIC_PARAMS(overrides?: CallOverrides): Promise<BigNumber>;

    "GENERIC_PARAMS()"(overrides?: CallOverrides): Promise<BigNumber>;

    RELAYDATA_TYPE(overrides?: CallOverrides): Promise<BigNumber>;

    "RELAYDATA_TYPE()"(overrides?: CallOverrides): Promise<BigNumber>;

    RELAYDATA_TYPEHASH(overrides?: CallOverrides): Promise<BigNumber>;

    "RELAYDATA_TYPEHASH()"(overrides?: CallOverrides): Promise<BigNumber>;

    RELAY_REQUEST_NAME(overrides?: CallOverrides): Promise<BigNumber>;

    "RELAY_REQUEST_NAME()"(overrides?: CallOverrides): Promise<BigNumber>;

    RELAY_REQUEST_SUFFIX(overrides?: CallOverrides): Promise<BigNumber>;

    "RELAY_REQUEST_SUFFIX()"(overrides?: CallOverrides): Promise<BigNumber>;

    RELAY_REQUEST_TYPE(overrides?: CallOverrides): Promise<BigNumber>;

    "RELAY_REQUEST_TYPE()"(overrides?: CallOverrides): Promise<BigNumber>;

    RELAY_REQUEST_TYPEHASH(overrides?: CallOverrides): Promise<BigNumber>;

    "RELAY_REQUEST_TYPEHASH()"(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    EIP712DOMAIN_TYPEHASH(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "EIP712DOMAIN_TYPEHASH()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    GENERIC_PARAMS(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "GENERIC_PARAMS()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    RELAYDATA_TYPE(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "RELAYDATA_TYPE()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    RELAYDATA_TYPEHASH(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "RELAYDATA_TYPEHASH()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    RELAY_REQUEST_NAME(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "RELAY_REQUEST_NAME()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    RELAY_REQUEST_SUFFIX(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "RELAY_REQUEST_SUFFIX()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    RELAY_REQUEST_TYPE(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "RELAY_REQUEST_TYPE()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    RELAY_REQUEST_TYPEHASH(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "RELAY_REQUEST_TYPEHASH()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}