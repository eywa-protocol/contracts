#!/bin/bash

DIR=$(dirname $0)
echo $DIR
cd $DIR
cd ../../
pwd

for net in network3 network2 network1
do
    npx hardhat run --no-compile scripts/bridge/updateEpoch.js --network ${net}
done
