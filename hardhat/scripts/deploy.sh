#!/bin/bash


cd gasless
# npx hardhat run ./scripts/deploy.js --network rinkeby
# npx hardhat run ./scripts/deploy.js --network bsctestnet
npx hardhat run ./scripts/deploy.js --network rinkeby    --paymastergsn node -pe 'JSON.parse(process.argv[1]).rinkeby.paymaster' "$(cat ../helper-hardhat-config.json)"
npx hardhat run ./scripts/deploy.js --network bsctestnet --paymastergsn node -pe 'JSON.parse(process.argv[1]).bsctestnet.paymaster' "$(cat ../helper-hardhat-config.json)"

cd ../bridge
# npx hardhat run ./scripts/deploy.js --network rinkeby
# npx hardhat run ./scripts/deploy.js --network bsctestnet
npx hardhat run ./scripts/deploy.js --network rinkeby  --bridge node -pe 'JSON.parse(process.argv[1]).rinkeby.bridge' "$(cat ../helper-hardhat-config.json)" \
 --nodelist node -pe 'JSON.parse(process.argv[1]).rinkeby.nodeList' "$(cat ../helper-hardhat-config.json)" \
 --mockdexpool node -pe 'JSON.parse(process.argv[1]).rinkeby.mockDexPool' "$(cat ../helper-hardhat-config.json)"

npx hardhat run ./scripts/deploy.js --network bsctestnet --bridge node -pe 'JSON.parse(process.argv[1]).bsctestnet.bridge' "$(cat ../helper-hardhat-config.json)" \
 --nodelist node -pe 'JSON.parse(process.argv[1]).bsctestnet.nodeList' "$(cat ../helper-hardhat-config.json)" \
 --mockdexpool node -pe 'JSON.parse(process.argv[1]).bsctestnet.mockDexPool' "$(cat ../helper-hardhat-config.json)"

cd ../amm_pool
npx hardhat run ./scripts/deploy.js --network rinkeby
npx hardhat run ./scripts/deploy.js --network bsctestnet

