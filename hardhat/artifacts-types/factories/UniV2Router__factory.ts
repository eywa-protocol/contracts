/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { UniV2Router, UniV2RouterInterface } from "../UniV2Router";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenA",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenB",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amountADesired",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountBDesired",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountAMin",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountBMin",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "addLiquidity",
    outputs: [
      {
        internalType: "uint256",
        name: "amountA",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountB",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "liquidity",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b50610127806100206000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063e8e3370014602d575b600080fd5b604a60383660046084565b60008080985098509895505050505050565b6040805193845260208401929092529082015260600160405180910390f35b80356001600160a01b0381168114607f57600080fd5b919050565b600080600080600080600080610100898b03121560a057600080fd5b60a7896069565b975060b360208a016069565b965060408901359550606089013594506080890135935060a0890135925060db60c08a016069565b915060e08901359050929598509295989093965056fea2646970667358221220921d278ffc699729e77071311c9702365fab21c74ffcabc034ff031f3da9b45d64736f6c634300080a0033";

type UniV2RouterConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: UniV2RouterConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class UniV2Router__factory extends ContractFactory {
  constructor(...args: UniV2RouterConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<UniV2Router> {
    return super.deploy(overrides || {}) as Promise<UniV2Router>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): UniV2Router {
    return super.attach(address) as UniV2Router;
  }
  connect(signer: Signer): UniV2Router__factory {
    return super.connect(signer) as UniV2Router__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): UniV2RouterInterface {
    return new utils.Interface(_abi) as UniV2RouterInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): UniV2Router {
    return new Contract(address, _abi, signerOrProvider) as UniV2Router;
  }
}