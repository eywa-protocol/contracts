#! /bin/bash

getField(){
 node -pe 'JSON.parse(process.argv[1]).'$1 "$(cat ../helper-hardhat-config.json)"
}

## only this networks will deploy otherwise script will processing and check NEEDS for deploy by all networks in config
## NOTE: "NEEDS" it is when address in config is epmty (=== '')
node ./_deploy.js --networks ${1} --parentpid $$

nets=$(jq 'keys[]' ../helper-hardhat-config.json)
for net in ${nets//\"/ }
do

cd ../gasless
npx hardhat run ./scripts/deploy.js --network ${net}
cd ../bridge
npx hardhat run ./scripts/deploy.js --network ${net}
cd ../amm_pool
npx hardhat run ./scripts/deploy.js --network ${net}
cd ../scripts
./update_env_adapter.sh create $(getField ${net}.env_file) BRIDGE_$(getField ${net}.n)=$(getField ${net}.bridge) NODELIST_$(getField ${net}.n)=$(getField ${net}.nodeList) DEXPOOL_$(getField ${net}.n)=$(getField ${net}.amm_pool) PORTAL_$(getField ${net}.n)=$(getField ${net}.portal) SYNTHESIS_$(getField ${net}.n)=$(getField ${net}.synthesis) PAYMASTER_$(getField ${net}.n)=$(getField ${net}.paymaster)

##
## init
##
cd  ../bridge
npx hardhat run ./scripts/updateDexBind.js  --network ${net}
cd ../amm_pool
npx hardhat run ./scripts/createRepresentation.js --network ${net}

done
