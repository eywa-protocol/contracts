#!/bin/bash

DIR=$(dirname $0)
echo $DIR
cd $DIR
cd ../../
pwd

if [ $NEED_RESET ]; then
    for net in network3 network2 network1 harmonylocal; do
        npx hardhat run --no-compile scripts/bridge/updateEpoch.js --network ${net}
    done
else
    npx hardhat run --no-compile scripts/bridge/updateEpoch.js --network harmonylocal
fi
