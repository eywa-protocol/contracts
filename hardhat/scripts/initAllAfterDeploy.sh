#!/bin/bash

###
### Trust addresses can invoke bridge

cd ../bridge
 npx hardhat run ./scripts/updateDexBind.js --network rinkeby
 npx hardhat run ./scripts/updateDexBind.js --network bsctestnet

cd ../amm_pool
npx hardhat run ./scripts/createRepresentation.js --network rinkeby
npx hardhat run ./scripts/createRepresentation.js --network bsctestnet

