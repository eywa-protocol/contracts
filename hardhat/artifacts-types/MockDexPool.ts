/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
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

export interface MockDexPoolInterface extends utils.Interface {
  functions: {
    "SOLANA_CHAIN_ID()": FunctionFragment;
    "SOLANA_RENT()": FunctionFragment;
    "SOLANA_SYSTEM_PROGRAM()": FunctionFragment;
    "SOLANA_TOKEN_PROGRAM()": FunctionFragment;
    "bridge()": FunctionFragment;
    "clearStats()": FunctionFragment;
    "doubleRequestError()": FunctionFragment;
    "doubleRequestIds(uint256)": FunctionFragment;
    "doubles()": FunctionFragment;
    "receiveRequestTest(uint256,bytes32)": FunctionFragment;
    "requests(bytes32)": FunctionFragment;
    "sendRequestTestV2(uint256,address,address,uint256)": FunctionFragment;
    "sendTestRequestToSolana(bytes32,bytes32,bytes32,bytes32,uint256,uint256)": FunctionFragment;
    "serializeSolanaStandaloneInstruction((bytes32,(bytes32,bool,bool)[],bytes))": FunctionFragment;
    "sigHash(string)": FunctionFragment;
    "testData()": FunctionFragment;
    "totalRequests()": FunctionFragment;
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
  encodeFunctionData(functionFragment: "bridge", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "clearStats",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "doubleRequestError",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "doubleRequestIds",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "doubles", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "receiveRequestTest",
    values: [BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "requests", values: [BytesLike]): string;
  encodeFunctionData(
    functionFragment: "sendRequestTestV2",
    values: [BigNumberish, string, string, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "sendTestRequestToSolana",
    values: [
      BytesLike,
      BytesLike,
      BytesLike,
      BytesLike,
      BigNumberish,
      BigNumberish
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "serializeSolanaStandaloneInstruction",
    values: [SolanaStandaloneInstructionStruct]
  ): string;
  encodeFunctionData(functionFragment: "sigHash", values: [string]): string;
  encodeFunctionData(functionFragment: "testData", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "totalRequests",
    values?: undefined
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
  decodeFunctionResult(functionFragment: "bridge", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "clearStats", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "doubleRequestError",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "doubleRequestIds",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "doubles", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "receiveRequestTest",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "requests", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "sendRequestTestV2",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "sendTestRequestToSolana",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "serializeSolanaStandaloneInstruction",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "sigHash", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "testData", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "totalRequests",
    data: BytesLike
  ): Result;

  events: {
    "RequestReceived(uint256)": EventFragment;
    "RequestReceivedV2(bytes32,uint256)": EventFragment;
    "RequestSent(bytes32)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "RequestReceived"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "RequestReceivedV2"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "RequestSent"): EventFragment;
}

export type RequestReceivedEvent = TypedEvent<[BigNumber], { data: BigNumber }>;

export type RequestReceivedEventFilter = TypedEventFilter<RequestReceivedEvent>;

export type RequestReceivedV2Event = TypedEvent<
  [string, BigNumber],
  { reqId: string; data: BigNumber }
>;

export type RequestReceivedV2EventFilter =
  TypedEventFilter<RequestReceivedV2Event>;

export type RequestSentEvent = TypedEvent<[string], { reqId: string }>;

export type RequestSentEventFilter = TypedEventFilter<RequestSentEvent>;

export interface MockDexPool extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: MockDexPoolInterface;

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

    bridge(overrides?: CallOverrides): Promise<[string]>;

    "bridge()"(overrides?: CallOverrides): Promise<[string]>;

    clearStats(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "clearStats()"(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    doubleRequestError(overrides?: CallOverrides): Promise<[BigNumber]>;

    "doubleRequestError()"(overrides?: CallOverrides): Promise<[BigNumber]>;

    doubleRequestIds(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[string]>;

    "doubleRequestIds(uint256)"(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[string]>;

    doubles(overrides?: CallOverrides): Promise<[string[]]>;

    "doubles()"(overrides?: CallOverrides): Promise<[string[]]>;

    receiveRequestTest(
      _testData: BigNumberish,
      _reqId: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "receiveRequestTest(uint256,bytes32)"(
      _testData: BigNumberish,
      _reqId: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    requests(arg0: BytesLike, overrides?: CallOverrides): Promise<[BigNumber]>;

    "requests(bytes32)"(
      arg0: BytesLike,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    sendRequestTestV2(
      testData_: BigNumberish,
      secondPartPool: string,
      oppBridge: string,
      chainId: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "sendRequestTestV2(uint256,address,address,uint256)"(
      testData_: BigNumberish,
      secondPartPool: string,
      oppBridge: string,
      chainId: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    sendTestRequestToSolana(
      testStubPID_: BytesLike,
      solBridgePID_: BytesLike,
      dataAcc_: BytesLike,
      bridgePDASigner_: BytesLike,
      testData_: BigNumberish,
      chainId: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "sendTestRequestToSolana(bytes32,bytes32,bytes32,bytes32,uint256,uint256)"(
      testStubPID_: BytesLike,
      solBridgePID_: BytesLike,
      dataAcc_: BytesLike,
      bridgePDASigner_: BytesLike,
      testData_: BigNumberish,
      chainId: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    serializeSolanaStandaloneInstruction(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<[string]>;

    "serializeSolanaStandaloneInstruction((bytes32,(bytes32,bool,bool)[],bytes))"(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<[string]>;

    sigHash(_data: string, overrides?: CallOverrides): Promise<[string]>;

    "sigHash(string)"(
      _data: string,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testData(overrides?: CallOverrides): Promise<[BigNumber]>;

    "testData()"(overrides?: CallOverrides): Promise<[BigNumber]>;

    totalRequests(overrides?: CallOverrides): Promise<[BigNumber]>;

    "totalRequests()"(overrides?: CallOverrides): Promise<[BigNumber]>;
  };

  SOLANA_CHAIN_ID(overrides?: CallOverrides): Promise<BigNumber>;

  "SOLANA_CHAIN_ID()"(overrides?: CallOverrides): Promise<BigNumber>;

  SOLANA_RENT(overrides?: CallOverrides): Promise<string>;

  "SOLANA_RENT()"(overrides?: CallOverrides): Promise<string>;

  SOLANA_SYSTEM_PROGRAM(overrides?: CallOverrides): Promise<string>;

  "SOLANA_SYSTEM_PROGRAM()"(overrides?: CallOverrides): Promise<string>;

  SOLANA_TOKEN_PROGRAM(overrides?: CallOverrides): Promise<string>;

  "SOLANA_TOKEN_PROGRAM()"(overrides?: CallOverrides): Promise<string>;

  bridge(overrides?: CallOverrides): Promise<string>;

  "bridge()"(overrides?: CallOverrides): Promise<string>;

  clearStats(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "clearStats()"(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  doubleRequestError(overrides?: CallOverrides): Promise<BigNumber>;

  "doubleRequestError()"(overrides?: CallOverrides): Promise<BigNumber>;

  doubleRequestIds(
    arg0: BigNumberish,
    overrides?: CallOverrides
  ): Promise<string>;

  "doubleRequestIds(uint256)"(
    arg0: BigNumberish,
    overrides?: CallOverrides
  ): Promise<string>;

  doubles(overrides?: CallOverrides): Promise<string[]>;

  "doubles()"(overrides?: CallOverrides): Promise<string[]>;

  receiveRequestTest(
    _testData: BigNumberish,
    _reqId: BytesLike,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "receiveRequestTest(uint256,bytes32)"(
    _testData: BigNumberish,
    _reqId: BytesLike,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  requests(arg0: BytesLike, overrides?: CallOverrides): Promise<BigNumber>;

  "requests(bytes32)"(
    arg0: BytesLike,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  sendRequestTestV2(
    testData_: BigNumberish,
    secondPartPool: string,
    oppBridge: string,
    chainId: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "sendRequestTestV2(uint256,address,address,uint256)"(
    testData_: BigNumberish,
    secondPartPool: string,
    oppBridge: string,
    chainId: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  sendTestRequestToSolana(
    testStubPID_: BytesLike,
    solBridgePID_: BytesLike,
    dataAcc_: BytesLike,
    bridgePDASigner_: BytesLike,
    testData_: BigNumberish,
    chainId: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "sendTestRequestToSolana(bytes32,bytes32,bytes32,bytes32,uint256,uint256)"(
    testStubPID_: BytesLike,
    solBridgePID_: BytesLike,
    dataAcc_: BytesLike,
    bridgePDASigner_: BytesLike,
    testData_: BigNumberish,
    chainId: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  serializeSolanaStandaloneInstruction(
    ix: SolanaStandaloneInstructionStruct,
    overrides?: CallOverrides
  ): Promise<string>;

  "serializeSolanaStandaloneInstruction((bytes32,(bytes32,bool,bool)[],bytes))"(
    ix: SolanaStandaloneInstructionStruct,
    overrides?: CallOverrides
  ): Promise<string>;

  sigHash(_data: string, overrides?: CallOverrides): Promise<string>;

  "sigHash(string)"(_data: string, overrides?: CallOverrides): Promise<string>;

  testData(overrides?: CallOverrides): Promise<BigNumber>;

  "testData()"(overrides?: CallOverrides): Promise<BigNumber>;

  totalRequests(overrides?: CallOverrides): Promise<BigNumber>;

  "totalRequests()"(overrides?: CallOverrides): Promise<BigNumber>;

  callStatic: {
    SOLANA_CHAIN_ID(overrides?: CallOverrides): Promise<BigNumber>;

    "SOLANA_CHAIN_ID()"(overrides?: CallOverrides): Promise<BigNumber>;

    SOLANA_RENT(overrides?: CallOverrides): Promise<string>;

    "SOLANA_RENT()"(overrides?: CallOverrides): Promise<string>;

    SOLANA_SYSTEM_PROGRAM(overrides?: CallOverrides): Promise<string>;

    "SOLANA_SYSTEM_PROGRAM()"(overrides?: CallOverrides): Promise<string>;

    SOLANA_TOKEN_PROGRAM(overrides?: CallOverrides): Promise<string>;

    "SOLANA_TOKEN_PROGRAM()"(overrides?: CallOverrides): Promise<string>;

    bridge(overrides?: CallOverrides): Promise<string>;

    "bridge()"(overrides?: CallOverrides): Promise<string>;

    clearStats(overrides?: CallOverrides): Promise<void>;

    "clearStats()"(overrides?: CallOverrides): Promise<void>;

    doubleRequestError(overrides?: CallOverrides): Promise<BigNumber>;

    "doubleRequestError()"(overrides?: CallOverrides): Promise<BigNumber>;

    doubleRequestIds(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<string>;

    "doubleRequestIds(uint256)"(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<string>;

    doubles(overrides?: CallOverrides): Promise<string[]>;

    "doubles()"(overrides?: CallOverrides): Promise<string[]>;

    receiveRequestTest(
      _testData: BigNumberish,
      _reqId: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    "receiveRequestTest(uint256,bytes32)"(
      _testData: BigNumberish,
      _reqId: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    requests(arg0: BytesLike, overrides?: CallOverrides): Promise<BigNumber>;

    "requests(bytes32)"(
      arg0: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    sendRequestTestV2(
      testData_: BigNumberish,
      secondPartPool: string,
      oppBridge: string,
      chainId: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    "sendRequestTestV2(uint256,address,address,uint256)"(
      testData_: BigNumberish,
      secondPartPool: string,
      oppBridge: string,
      chainId: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    sendTestRequestToSolana(
      testStubPID_: BytesLike,
      solBridgePID_: BytesLike,
      dataAcc_: BytesLike,
      bridgePDASigner_: BytesLike,
      testData_: BigNumberish,
      chainId: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    "sendTestRequestToSolana(bytes32,bytes32,bytes32,bytes32,uint256,uint256)"(
      testStubPID_: BytesLike,
      solBridgePID_: BytesLike,
      dataAcc_: BytesLike,
      bridgePDASigner_: BytesLike,
      testData_: BigNumberish,
      chainId: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    serializeSolanaStandaloneInstruction(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<string>;

    "serializeSolanaStandaloneInstruction((bytes32,(bytes32,bool,bool)[],bytes))"(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<string>;

    sigHash(_data: string, overrides?: CallOverrides): Promise<string>;

    "sigHash(string)"(
      _data: string,
      overrides?: CallOverrides
    ): Promise<string>;

    testData(overrides?: CallOverrides): Promise<BigNumber>;

    "testData()"(overrides?: CallOverrides): Promise<BigNumber>;

    totalRequests(overrides?: CallOverrides): Promise<BigNumber>;

    "totalRequests()"(overrides?: CallOverrides): Promise<BigNumber>;
  };

  filters: {
    "RequestReceived(uint256)"(data?: null): RequestReceivedEventFilter;
    RequestReceived(data?: null): RequestReceivedEventFilter;

    "RequestReceivedV2(bytes32,uint256)"(
      reqId?: null,
      data?: null
    ): RequestReceivedV2EventFilter;
    RequestReceivedV2(reqId?: null, data?: null): RequestReceivedV2EventFilter;

    "RequestSent(bytes32)"(reqId?: null): RequestSentEventFilter;
    RequestSent(reqId?: null): RequestSentEventFilter;
  };

  estimateGas: {
    SOLANA_CHAIN_ID(overrides?: CallOverrides): Promise<BigNumber>;

    "SOLANA_CHAIN_ID()"(overrides?: CallOverrides): Promise<BigNumber>;

    SOLANA_RENT(overrides?: CallOverrides): Promise<BigNumber>;

    "SOLANA_RENT()"(overrides?: CallOverrides): Promise<BigNumber>;

    SOLANA_SYSTEM_PROGRAM(overrides?: CallOverrides): Promise<BigNumber>;

    "SOLANA_SYSTEM_PROGRAM()"(overrides?: CallOverrides): Promise<BigNumber>;

    SOLANA_TOKEN_PROGRAM(overrides?: CallOverrides): Promise<BigNumber>;

    "SOLANA_TOKEN_PROGRAM()"(overrides?: CallOverrides): Promise<BigNumber>;

    bridge(overrides?: CallOverrides): Promise<BigNumber>;

    "bridge()"(overrides?: CallOverrides): Promise<BigNumber>;

    clearStats(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "clearStats()"(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    doubleRequestError(overrides?: CallOverrides): Promise<BigNumber>;

    "doubleRequestError()"(overrides?: CallOverrides): Promise<BigNumber>;

    doubleRequestIds(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    "doubleRequestIds(uint256)"(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    doubles(overrides?: CallOverrides): Promise<BigNumber>;

    "doubles()"(overrides?: CallOverrides): Promise<BigNumber>;

    receiveRequestTest(
      _testData: BigNumberish,
      _reqId: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "receiveRequestTest(uint256,bytes32)"(
      _testData: BigNumberish,
      _reqId: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    requests(arg0: BytesLike, overrides?: CallOverrides): Promise<BigNumber>;

    "requests(bytes32)"(
      arg0: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    sendRequestTestV2(
      testData_: BigNumberish,
      secondPartPool: string,
      oppBridge: string,
      chainId: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "sendRequestTestV2(uint256,address,address,uint256)"(
      testData_: BigNumberish,
      secondPartPool: string,
      oppBridge: string,
      chainId: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    sendTestRequestToSolana(
      testStubPID_: BytesLike,
      solBridgePID_: BytesLike,
      dataAcc_: BytesLike,
      bridgePDASigner_: BytesLike,
      testData_: BigNumberish,
      chainId: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "sendTestRequestToSolana(bytes32,bytes32,bytes32,bytes32,uint256,uint256)"(
      testStubPID_: BytesLike,
      solBridgePID_: BytesLike,
      dataAcc_: BytesLike,
      bridgePDASigner_: BytesLike,
      testData_: BigNumberish,
      chainId: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    serializeSolanaStandaloneInstruction(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    "serializeSolanaStandaloneInstruction((bytes32,(bytes32,bool,bool)[],bytes))"(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    sigHash(_data: string, overrides?: CallOverrides): Promise<BigNumber>;

    "sigHash(string)"(
      _data: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testData(overrides?: CallOverrides): Promise<BigNumber>;

    "testData()"(overrides?: CallOverrides): Promise<BigNumber>;

    totalRequests(overrides?: CallOverrides): Promise<BigNumber>;

    "totalRequests()"(overrides?: CallOverrides): Promise<BigNumber>;
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

    bridge(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "bridge()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    clearStats(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "clearStats()"(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    doubleRequestError(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "doubleRequestError()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    doubleRequestIds(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "doubleRequestIds(uint256)"(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    doubles(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "doubles()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    receiveRequestTest(
      _testData: BigNumberish,
      _reqId: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "receiveRequestTest(uint256,bytes32)"(
      _testData: BigNumberish,
      _reqId: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    requests(
      arg0: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "requests(bytes32)"(
      arg0: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    sendRequestTestV2(
      testData_: BigNumberish,
      secondPartPool: string,
      oppBridge: string,
      chainId: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "sendRequestTestV2(uint256,address,address,uint256)"(
      testData_: BigNumberish,
      secondPartPool: string,
      oppBridge: string,
      chainId: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    sendTestRequestToSolana(
      testStubPID_: BytesLike,
      solBridgePID_: BytesLike,
      dataAcc_: BytesLike,
      bridgePDASigner_: BytesLike,
      testData_: BigNumberish,
      chainId: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "sendTestRequestToSolana(bytes32,bytes32,bytes32,bytes32,uint256,uint256)"(
      testStubPID_: BytesLike,
      solBridgePID_: BytesLike,
      dataAcc_: BytesLike,
      bridgePDASigner_: BytesLike,
      testData_: BigNumberish,
      chainId: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    serializeSolanaStandaloneInstruction(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "serializeSolanaStandaloneInstruction((bytes32,(bytes32,bool,bool)[],bytes))"(
      ix: SolanaStandaloneInstructionStruct,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    sigHash(
      _data: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "sigHash(string)"(
      _data: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testData(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "testData()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    totalRequests(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "totalRequests()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}