#!/bin/bash

getField() {
    node -pe 'JSON.parse(process.argv[1]).'$1 "$(cat ../helper-hardhat-config.json)"
}

## if you want to deploy a part of smart contracts use to flags: --paymastergsn, --bridge, --nodelist, --mockdexpool
## mockdexpool is for test case. Maybe deprecated.
##

cd ../gasless
 npx hardhat run ./scripts/deploy.js --network rinkeby
 npx hardhat run ./scripts/deploy.js --network bsctestnet
#npx hardhat run ./scripts/deploy.js --network rinkeby    --paymastergsn getField rinkeby.paymaster
#npx hardhat run ./scripts/deploy.js --network bsctestnet --paymastergsn getField bsctestnet.paymaster

cd ../bridge
 npx hardhat run ./scripts/deploy.js --network rinkeby
 npx hardhat run ./scripts/deploy.js --network bsctestnet
#npx hardhat run ./scripts/deploy.js --network rinkeby  --bridge getField rinkeby.bridge \
# --nodelist getField rinkeby.nodeList \
# --mockdexpool getField rinkeby.mockDexPool

#npx hardhat run ./scripts/deploy.js --network bsctestnet --bridge getField bsctestnet.bridge \
# --nodelist getField bsctestnet.nodeList \
# --mockdexpool getField bsctestnet.mockDexPool

cd ../amm_pool
npx hardhat run ./scripts/deploy.js --network rinkeby
npx hardhat run ./scripts/deploy.js --network bsctestnet

###
## Build env for golang bridge
#
cd ../scripts
./update_env_adapter.sh create $(getField rinkeby.env_file) BRIDGE_$(getField rinkeby.n)=$(getField rinkeby.bridge) NODELIST_$(getField rinkeby.n)=$(getField rinkeby.nodeList) DEXPOOL_$(getField rinkeby.n)=$(getField rinkeby.amm_pool) PORTAL_$(getField rinkeby.n)=$(getField rinkeby.portal) SYNTHESIS_$(getField rinkeby.n)=$(getField rinkeby.synthesis) PAYMASTER_$(getField rinkeby.n)=$(getField rinkeby.paymaster)

./update_env_adapter.sh create $(getField bsctestnet.env_file) BRIDGE_$(getField bsctestnet.n)=$(getField bsctestnet.bridge) NODELIST_$(getField bsctestnet.n)=$(getField bsctestnet.nodeList) DEXPOOL_$(getField bsctestnet.n)=$(getField bsctestnet.amm_pool) PORTAL_$(getField bsctestnet.n)=$(getField bsctestnet.portal) SYNTHESIS_$(getField bsctestnet.n)=$(getField bsctestnet.synthesis) PAYMASTER_$(getField bsctestnet.n)=$(getField bsctestnet.paymaster)
