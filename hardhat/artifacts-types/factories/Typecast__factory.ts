/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { Typecast, TypecastInterface } from "../Typecast";

const _abi = [
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "x",
        type: "bytes32",
      },
    ],
    name: "castToAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "a",
        type: "address",
      },
    ],
    name: "castToBytes32",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
];

export class Typecast__factory {
  static readonly abi = _abi;
  static createInterface(): TypecastInterface {
    return new utils.Interface(_abi) as TypecastInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): Typecast {
    return new Contract(address, _abi, signerOrProvider) as Typecast;
  }
}