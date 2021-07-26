#!/usr/bin/env bash

export TESTNET_BSC=
export TESTNET_RINKEBY=
export TESTNET_MUMBAI=


npx truffle migrate --reset --network rinkeby
npx truffle migrate --reset --network bsctestnet
npx truffle migrate --reset --network mumbai
