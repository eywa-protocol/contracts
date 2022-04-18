#!/bin/bash

DIR=$(dirname $0)
echo $DIR
cd $DIR
cd ../../
pwd

for net in network3 network1 network2 harmonylocal
do
    npx hardhat run --no-compile scripts/bridge/updateEpoch.js --network ${net}
done
