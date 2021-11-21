#! /bin/bash


getField(){
 node -pe 'JSON.parse(process.argv[1]).'$1 "$(cat ./helper-hardhat-config.json)"
}


nets=${1}
if [[ "$nets" =~ ^('')$ ]]
 then
  nets=$(jq 'keys[]' ./helper-hardhat-config.json)
  nets=${nets//\"/ }
  echo '> Create (override) env files only'
  for net in ${nets//\,/ }
  do
    ./scripts/update_env_adapter.sh create $(getField ${net}.env_file[0])  RPC_URL=$(getField ${net}.rpcUrl) chainId=$(getField ${net}.chainId) bridge=$(getField ${net}.bridge) nodeList=$(getField ${net}.nodeList) mockDexPool=$(getField ${net}.mockDexPool) PORTAL_ADDRESS=$(getField ${net}.portal) synthesis=$(getField ${net}.synthesis) paymaster=$(getField ${net}.paymaster)
    ./scripts/update_env_adapter.sh create $(getField ${net}.env_file[1]) BRIDGE_$(getField ${net}.n)=$(getField ${net}.bridge) NODELIST_$(getField ${net}.n)=$(getField ${net}.nodeList) DEXPOOL_$(getField ${net}.n)=$(getField ${net}.mockDexPool) PORTAL_$(getField ${net}.n)=$(getField ${net}.portal) SYNTHESIS_$(getField ${net}.n)=$(getField ${net}.synthesis) PAYMASTER_$(getField ${net}.n)=$(getField ${net}.paymaster)
    echo $(getField ${net}.env_file[0])
    echo $(getField ${net}.env_file[1])
  done
  echo "for end"
  exit 0
 fi


 for net in ${nets//\,/ }
 do
 echo 'bash script for network:' ${net}
 echo '==========================================='
 echo ''
 ## NOTE !!!!! : gsn-node where owner is opengsn. Uncomment for our ralyer gsn.
 #npx hardhat run ./scripts/gassless/deploy.js --network ${net}
 # npx hardhat run ./scripts/bridge/deploy.js   --network ${net}
 # npx hardhat run ./scripts/amm_pool/deploy.js --network ${net}

 ./scripts/update_env_adapter.sh create $(getField ${net}.env_file[0])  RPC_URL=$(getField ${net}.rpcUrl) chainId=$(getField ${net}.chainId) bridge=$(getField ${net}.bridge) nodeList=$(getField ${net}.nodeList) mockDexPool=$(getField ${net}.mockDexPool) PORTAL_ADDRESS=$(getField ${net}.portal) synthesis=$(getField ${net}.synthesis) paymaster=$(getField ${net}.paymaster)
 ./scripts/update_env_adapter.sh create $(getField ${net}.env_file[1]) BRIDGE_$(getField ${net}.n)=$(getField ${net}.bridge) NODELIST_$(getField ${net}.n)=$(getField ${net}.nodeList) DEXPOOL_$(getField ${net}.n)=$(getField ${net}.mockDexPool) PORTAL_$(getField ${net}.n)=$(getField ${net}.portal) SYNTHESIS_$(getField ${net}.n)=$(getField ${net}.synthesis) PAYMASTER_$(getField ${net}.n)=$(getField ${net}.paymaster)
 echo $(getField ${net}.env_file[0])
 echo $(getField ${net}.env_file[1])

 python3 .scripts/render_helper.py "$net"
 # npx hardhat run ./scripts/amm_pool/createRepresentation.js --network ${net}
 done

 for net in ${nets//\,/ }
 do
 echo 'init into:' ${net}
 ##
 ## init
 ##
 # npx hardhat run ./scripts/bridge/updateDexBind.js  --network ${net}

 done
