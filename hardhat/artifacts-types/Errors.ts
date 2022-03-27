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

export interface ErrorsInterface extends utils.Interface {
  functions: {
    "DATA_INCONSISTENCY()": FunctionFragment;
    "DEPOSIT_IS_LOCKED()": FunctionFragment;
    "EMISSION_ANNUAL_RATE_IS_TOO_HIGH()": FunctionFragment;
    "EMISSION_ANNUAL_RATE_IS_TOO_LOW()": FunctionFragment;
    "FEE_IS_TOO_HIGH()": FunctionFragment;
    "FEE_IS_TOO_LOW()": FunctionFragment;
    "INSUFFICIENT_DEPOSIT()": FunctionFragment;
    "NOT_DEPOSIT_OWNER()": FunctionFragment;
    "SAME_VALUE()": FunctionFragment;
    "ZERO_ADDRESS()": FunctionFragment;
    "ZERO_PROFIT()": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "DATA_INCONSISTENCY",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "DEPOSIT_IS_LOCKED",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "EMISSION_ANNUAL_RATE_IS_TOO_HIGH",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "EMISSION_ANNUAL_RATE_IS_TOO_LOW",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "FEE_IS_TOO_HIGH",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "FEE_IS_TOO_LOW",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "INSUFFICIENT_DEPOSIT",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "NOT_DEPOSIT_OWNER",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "SAME_VALUE",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "ZERO_ADDRESS",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "ZERO_PROFIT",
    values?: undefined
  ): string;

  decodeFunctionResult(
    functionFragment: "DATA_INCONSISTENCY",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "DEPOSIT_IS_LOCKED",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "EMISSION_ANNUAL_RATE_IS_TOO_HIGH",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "EMISSION_ANNUAL_RATE_IS_TOO_LOW",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "FEE_IS_TOO_HIGH",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "FEE_IS_TOO_LOW",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "INSUFFICIENT_DEPOSIT",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "NOT_DEPOSIT_OWNER",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "SAME_VALUE", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "ZERO_ADDRESS",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "ZERO_PROFIT",
    data: BytesLike
  ): Result;

  events: {};
}

export interface Errors extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: ErrorsInterface;

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
    DATA_INCONSISTENCY(overrides?: CallOverrides): Promise<[string]>;

    "DATA_INCONSISTENCY()"(overrides?: CallOverrides): Promise<[string]>;

    DEPOSIT_IS_LOCKED(overrides?: CallOverrides): Promise<[string]>;

    "DEPOSIT_IS_LOCKED()"(overrides?: CallOverrides): Promise<[string]>;

    EMISSION_ANNUAL_RATE_IS_TOO_HIGH(
      overrides?: CallOverrides
    ): Promise<[string]>;

    "EMISSION_ANNUAL_RATE_IS_TOO_HIGH()"(
      overrides?: CallOverrides
    ): Promise<[string]>;

    EMISSION_ANNUAL_RATE_IS_TOO_LOW(
      overrides?: CallOverrides
    ): Promise<[string]>;

    "EMISSION_ANNUAL_RATE_IS_TOO_LOW()"(
      overrides?: CallOverrides
    ): Promise<[string]>;

    FEE_IS_TOO_HIGH(overrides?: CallOverrides): Promise<[string]>;

    "FEE_IS_TOO_HIGH()"(overrides?: CallOverrides): Promise<[string]>;

    FEE_IS_TOO_LOW(overrides?: CallOverrides): Promise<[string]>;

    "FEE_IS_TOO_LOW()"(overrides?: CallOverrides): Promise<[string]>;

    INSUFFICIENT_DEPOSIT(overrides?: CallOverrides): Promise<[string]>;

    "INSUFFICIENT_DEPOSIT()"(overrides?: CallOverrides): Promise<[string]>;

    NOT_DEPOSIT_OWNER(overrides?: CallOverrides): Promise<[string]>;

    "NOT_DEPOSIT_OWNER()"(overrides?: CallOverrides): Promise<[string]>;

    SAME_VALUE(overrides?: CallOverrides): Promise<[string]>;

    "SAME_VALUE()"(overrides?: CallOverrides): Promise<[string]>;

    ZERO_ADDRESS(overrides?: CallOverrides): Promise<[string]>;

    "ZERO_ADDRESS()"(overrides?: CallOverrides): Promise<[string]>;

    ZERO_PROFIT(overrides?: CallOverrides): Promise<[string]>;

    "ZERO_PROFIT()"(overrides?: CallOverrides): Promise<[string]>;
  };

  DATA_INCONSISTENCY(overrides?: CallOverrides): Promise<string>;

  "DATA_INCONSISTENCY()"(overrides?: CallOverrides): Promise<string>;

  DEPOSIT_IS_LOCKED(overrides?: CallOverrides): Promise<string>;

  "DEPOSIT_IS_LOCKED()"(overrides?: CallOverrides): Promise<string>;

  EMISSION_ANNUAL_RATE_IS_TOO_HIGH(overrides?: CallOverrides): Promise<string>;

  "EMISSION_ANNUAL_RATE_IS_TOO_HIGH()"(
    overrides?: CallOverrides
  ): Promise<string>;

  EMISSION_ANNUAL_RATE_IS_TOO_LOW(overrides?: CallOverrides): Promise<string>;

  "EMISSION_ANNUAL_RATE_IS_TOO_LOW()"(
    overrides?: CallOverrides
  ): Promise<string>;

  FEE_IS_TOO_HIGH(overrides?: CallOverrides): Promise<string>;

  "FEE_IS_TOO_HIGH()"(overrides?: CallOverrides): Promise<string>;

  FEE_IS_TOO_LOW(overrides?: CallOverrides): Promise<string>;

  "FEE_IS_TOO_LOW()"(overrides?: CallOverrides): Promise<string>;

  INSUFFICIENT_DEPOSIT(overrides?: CallOverrides): Promise<string>;

  "INSUFFICIENT_DEPOSIT()"(overrides?: CallOverrides): Promise<string>;

  NOT_DEPOSIT_OWNER(overrides?: CallOverrides): Promise<string>;

  "NOT_DEPOSIT_OWNER()"(overrides?: CallOverrides): Promise<string>;

  SAME_VALUE(overrides?: CallOverrides): Promise<string>;

  "SAME_VALUE()"(overrides?: CallOverrides): Promise<string>;

  ZERO_ADDRESS(overrides?: CallOverrides): Promise<string>;

  "ZERO_ADDRESS()"(overrides?: CallOverrides): Promise<string>;

  ZERO_PROFIT(overrides?: CallOverrides): Promise<string>;

  "ZERO_PROFIT()"(overrides?: CallOverrides): Promise<string>;

  callStatic: {
    DATA_INCONSISTENCY(overrides?: CallOverrides): Promise<string>;

    "DATA_INCONSISTENCY()"(overrides?: CallOverrides): Promise<string>;

    DEPOSIT_IS_LOCKED(overrides?: CallOverrides): Promise<string>;

    "DEPOSIT_IS_LOCKED()"(overrides?: CallOverrides): Promise<string>;

    EMISSION_ANNUAL_RATE_IS_TOO_HIGH(
      overrides?: CallOverrides
    ): Promise<string>;

    "EMISSION_ANNUAL_RATE_IS_TOO_HIGH()"(
      overrides?: CallOverrides
    ): Promise<string>;

    EMISSION_ANNUAL_RATE_IS_TOO_LOW(overrides?: CallOverrides): Promise<string>;

    "EMISSION_ANNUAL_RATE_IS_TOO_LOW()"(
      overrides?: CallOverrides
    ): Promise<string>;

    FEE_IS_TOO_HIGH(overrides?: CallOverrides): Promise<string>;

    "FEE_IS_TOO_HIGH()"(overrides?: CallOverrides): Promise<string>;

    FEE_IS_TOO_LOW(overrides?: CallOverrides): Promise<string>;

    "FEE_IS_TOO_LOW()"(overrides?: CallOverrides): Promise<string>;

    INSUFFICIENT_DEPOSIT(overrides?: CallOverrides): Promise<string>;

    "INSUFFICIENT_DEPOSIT()"(overrides?: CallOverrides): Promise<string>;

    NOT_DEPOSIT_OWNER(overrides?: CallOverrides): Promise<string>;

    "NOT_DEPOSIT_OWNER()"(overrides?: CallOverrides): Promise<string>;

    SAME_VALUE(overrides?: CallOverrides): Promise<string>;

    "SAME_VALUE()"(overrides?: CallOverrides): Promise<string>;

    ZERO_ADDRESS(overrides?: CallOverrides): Promise<string>;

    "ZERO_ADDRESS()"(overrides?: CallOverrides): Promise<string>;

    ZERO_PROFIT(overrides?: CallOverrides): Promise<string>;

    "ZERO_PROFIT()"(overrides?: CallOverrides): Promise<string>;
  };

  filters: {};

  estimateGas: {
    DATA_INCONSISTENCY(overrides?: CallOverrides): Promise<BigNumber>;

    "DATA_INCONSISTENCY()"(overrides?: CallOverrides): Promise<BigNumber>;

    DEPOSIT_IS_LOCKED(overrides?: CallOverrides): Promise<BigNumber>;

    "DEPOSIT_IS_LOCKED()"(overrides?: CallOverrides): Promise<BigNumber>;

    EMISSION_ANNUAL_RATE_IS_TOO_HIGH(
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    "EMISSION_ANNUAL_RATE_IS_TOO_HIGH()"(
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    EMISSION_ANNUAL_RATE_IS_TOO_LOW(
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    "EMISSION_ANNUAL_RATE_IS_TOO_LOW()"(
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    FEE_IS_TOO_HIGH(overrides?: CallOverrides): Promise<BigNumber>;

    "FEE_IS_TOO_HIGH()"(overrides?: CallOverrides): Promise<BigNumber>;

    FEE_IS_TOO_LOW(overrides?: CallOverrides): Promise<BigNumber>;

    "FEE_IS_TOO_LOW()"(overrides?: CallOverrides): Promise<BigNumber>;

    INSUFFICIENT_DEPOSIT(overrides?: CallOverrides): Promise<BigNumber>;

    "INSUFFICIENT_DEPOSIT()"(overrides?: CallOverrides): Promise<BigNumber>;

    NOT_DEPOSIT_OWNER(overrides?: CallOverrides): Promise<BigNumber>;

    "NOT_DEPOSIT_OWNER()"(overrides?: CallOverrides): Promise<BigNumber>;

    SAME_VALUE(overrides?: CallOverrides): Promise<BigNumber>;

    "SAME_VALUE()"(overrides?: CallOverrides): Promise<BigNumber>;

    ZERO_ADDRESS(overrides?: CallOverrides): Promise<BigNumber>;

    "ZERO_ADDRESS()"(overrides?: CallOverrides): Promise<BigNumber>;

    ZERO_PROFIT(overrides?: CallOverrides): Promise<BigNumber>;

    "ZERO_PROFIT()"(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    DATA_INCONSISTENCY(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "DATA_INCONSISTENCY()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    DEPOSIT_IS_LOCKED(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "DEPOSIT_IS_LOCKED()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    EMISSION_ANNUAL_RATE_IS_TOO_HIGH(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "EMISSION_ANNUAL_RATE_IS_TOO_HIGH()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    EMISSION_ANNUAL_RATE_IS_TOO_LOW(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "EMISSION_ANNUAL_RATE_IS_TOO_LOW()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    FEE_IS_TOO_HIGH(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "FEE_IS_TOO_HIGH()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    FEE_IS_TOO_LOW(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "FEE_IS_TOO_LOW()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    INSUFFICIENT_DEPOSIT(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "INSUFFICIENT_DEPOSIT()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    NOT_DEPOSIT_OWNER(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "NOT_DEPOSIT_OWNER()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    SAME_VALUE(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "SAME_VALUE()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    ZERO_ADDRESS(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "ZERO_ADDRESS()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    ZERO_PROFIT(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "ZERO_PROFIT()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}