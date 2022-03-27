/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { BridgeCore, BridgeCoreInterface } from "../BridgeCore";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "requestType",
        type: "string",
      },
      {
        indexed: false,
        internalType: "address",
        name: "bridge",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "requestId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "selector",
        type: "bytes",
      },
      {
        indexed: false,
        internalType: "address",
        name: "receiveSide",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "oppositeBridge",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "chainid",
        type: "uint256",
      },
    ],
    name: "OracleRequest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "requestType",
        type: "string",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "bridge",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "requestId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "selector",
        type: "bytes",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "oppositeBridge",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "chainid",
        type: "uint256",
      },
    ],
    name: "OracleRequestSolana",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "reqId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "address",
        name: "receiveSide",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "bridgeFrom",
        type: "bytes32",
      },
    ],
    name: "ReceiveRequest",
    type: "event",
  },
  {
    inputs: [],
    name: "_listNode",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "from",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "oppositeBridge",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "to",
        type: "bytes32",
      },
    ],
    name: "addContractBind",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
    ],
    name: "getNonce",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "oppositeBridge",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "chainId",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "receiveSide",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "from",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "nonce",
        type: "uint256",
      },
    ],
    name: "prepareRqId",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export class BridgeCore__factory {
  static readonly abi = _abi;
  static createInterface(): BridgeCoreInterface {
    return new utils.Interface(_abi) as BridgeCoreInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): BridgeCore {
    return new Contract(address, _abi, signerOrProvider) as BridgeCore;
  }
}