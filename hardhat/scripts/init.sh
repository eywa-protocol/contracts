#! /bin/bash


getField(){
 node -pe 'JSON.parse(process.argv[1]).'$1 "$(cat /contracts/helper-hardhat-config.json)"
}


nets=${1}

 for net in ${nets//\,/ }; do
 echo 'bash script init for network:' ${net}
 echo '==========================================='
 echo ''
 npx hardhat run ./scripts/amm_pool/createRepresentation.js --network ${net}
 npx hardhat run ./scripts/bridge/updateDexBind.js  --network ${net}
 done
