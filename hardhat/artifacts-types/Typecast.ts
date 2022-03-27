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

export interface TypecastInterface extends utils.Interface {
  functions: {
    "castToAddress(bytes32)": FunctionFragment;
    "castToBytes(address)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "castToAddress",
    values: [BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "castToBytes", values: [string]): string;

  decodeFunctionResult(
    functionFragment: "castToAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "castToBytes",
    data: BytesLike
  ): Result;

  events: {};
}

export interface Typecast extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: TypecastInterface;

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
    castToAddress(x: BytesLike, overrides?: CallOverrides): Promise<[string]>;

    "castToAddress(bytes32)"(
      x: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    "castToBytes(address)"(
      a: string,
      overrides?: CallOverrides
    ): Promise<[string]>;

    "castToBytes(bytes32)"(
      a: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;
  };

  castToAddress(x: BytesLike, overrides?: CallOverrides): Promise<string>;

  "castToAddress(bytes32)"(
    x: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  "castToBytes(address)"(a: string, overrides?: CallOverrides): Promise<string>;

  "castToBytes(bytes32)"(
    a: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  callStatic: {
    castToAddress(x: BytesLike, overrides?: CallOverrides): Promise<string>;

    "castToAddress(bytes32)"(
      x: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    "castToBytes(address)"(
      a: string,
      overrides?: CallOverrides
    ): Promise<string>;

    "castToBytes(bytes32)"(
      a: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;
  };

  filters: {};

  estimateGas: {
    castToAddress(x: BytesLike, overrides?: CallOverrides): Promise<BigNumber>;

    "castToAddress(bytes32)"(
      x: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    "castToBytes(address)"(
      a: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    "castToBytes(bytes32)"(
      a: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    castToAddress(
      x: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "castToAddress(bytes32)"(
      x: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "castToBytes(address)"(
      a: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "castToBytes(bytes32)"(
      a: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}