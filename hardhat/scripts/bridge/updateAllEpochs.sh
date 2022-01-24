#!/bin/bash

while ! [ -d .git ]; do cd ..; done
cd ../eth-contracts/hardhat/ || cd eth-contracts/hardhat/

for net in network3 network2 network1
do
    npx hardhat run --no-compile scripts/bridge/updateEpoch.js --network ${net}
done
