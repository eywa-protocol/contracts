#! /bin/bash

helper_path="${HHC_PATH:-./helper-hardhat-config.json}"

getField(){
 node -pe 'JSON.parse(process.argv[1]).'$1 "$(cat $helper_path)"
}

echo "-----debug----"
echo "nets - $nets"
echo "regnet - $REGNET"
echo "part - $PART"
echo "step - $STEP"

nets=${1}
if [[ ${1} =~ ^('')$ ]]; then
  nets=$(jq 'keys[]' ./helper-hardhat-config.json)
  nets=${nets//\"/ }
  echo '> Create (override) env files only'
  for net in ${nets//\,/ }; do
    ./scripts/update_env_adapter.sh create $(getField ${net}.env_file[0])  \
      RPC_URL=$(getField ${net}.rpcUrl) \
      NETWORK_ID=$(getField ${net}.chainId) \
      NETWORK_NAME=${net} \
      BRIDGE_ADDRESS=$(getField ${net}.bridge) \
      DEXPOOL_ADDRESS=$(getField ${net}.mockDexPool) \
      PORTAL_ADDRESS=$(getField ${net}.portal) \
      SYNTHESIS_ADDRESS=$(getField ${net}.synthesis) \
      PAYMASTER_ADDRESS=$(getField ${net}.paymaster) \
      EYWA_TOKEN_ADDRESS=$(getField ${net}.eywa) \
      TEST_TOKEN_ADDRESS=$(getField ${net}?.token[0]?.address) \
      NODEREGISTRY_ADDRESS=$(getField ${net}.nodeRegistry) \
      FORWARDER_ADDRESS=$(getField ${net}.forwarder) \
    && echo $(getField ${net}.env_file[0])

    ./scripts/update_env_adapter.sh create $(getField ${net}.env_file[1]) \
      BRIDGE_$(getField ${net}.n)=$(getField ${net}.bridge) \
      NODEREGISTRY_$(getField ${net}.n)=$(getField ${net}.nodeRegistry) \
      DEXPOOL_$(getField ${net}.n)=$(getField ${net}.mockDexPool) \
      PORTAL_$(getField ${net}.n)=$(getField ${net}.portal) \
      SYNTHESIS_$(getField ${net}.n)=$(getField ${net}.synthesis) \
      PAYMASTER_$(getField ${net}.n)=$(getField ${net}.paymaster) \
      EYWA_TOKEN_$(getField ${net}.n)=$(getField ${net}.eywa) \
      FORWARDER_$(getField ${net}.n)=$(getField ${net}.forwarder) \
    && echo $(getField ${net}.env_file[1])

    ./scripts/env2json_adapter.sh $(getField ${net}.env_file[0])
    ./scripts/env2json_adapter.sh $(getField ${net}.env_file[1])
  done
  exit 0
 fi

regnet="${REGNET:-$(cut -d "," -f1 <<<$nets)}"
for net in ${nets//\,/ }; do
echo 'bash script for network:' ${net}
echo '==========================================='
echo ''
## NOTE !!!!! : gsn-node where owner is opengsn. Uncomment for our ralyer gsn.
#npx hardhat run --no-compile ./scripts/gassless/deploy.js --network ${net}
npx hardhat balanceDeployer --network ${net}

  if [ \( ! -z "$REGNET" -a "$PART" == "deploy_bridge" -a "$STEP" != "init" \) -o \( -z "$REGNET" \) ]; then
    if [ ${net} == ${regnet} ]; then
        npx hardhat run --no-compile ./scripts/bridge/deployToService.js --network ${regnet}
    else
        npx hardhat run --no-compile ./scripts/bridge/deploy.js --network ${net}
    fi

    npx hardhat run --no-compile ./scripts/amm_pool/deploy.js --network ${net}
    npx hardhat run --no-compile ./scripts/deployERC20.js --network ${net}

      ./scripts/update_env_adapter.sh create $(getField ${net}.env_file[0])  \
        RPC_URL=$(getField ${net}.rpcUrl) \
        NETWORK_ID=$(getField ${net}.chainId) \
        NETWORK_NAME=${net} \
        BRIDGE_ADDRESS=$(getField ${net}.bridge) \
        NODEREGISTRY_ADDRESS=$(getField ${net}.nodeRegistry) \
        DEXPOOL_ADDRESS=$(getField ${net}.mockDexPool) \
        PORTAL_ADDRESS=$(getField ${net}.portal) \
        SYNTHESIS_ADDRESS=$(getField ${net}.synthesis) \
        PAYMASTER_ADDRESS=$(getField ${net}.paymaster) \
        EYWA_TOKEN_ADDRESS=$(getField ${net}.eywa) \
        TEST_TOKEN_ADDRESS=$(getField ${net}?.token[0]?.address) \
        FORWARDER_ADDRESS=$(getField ${net}.forwarder) \
        ROUTER_ADDRESS=$(getField ${net}.router) \
      && echo $(getField ${net}.env_file[0])

      ./scripts/update_env_adapter.sh create $(getField ${net}.env_file[1]) \
        BRIDGE_$(getField ${net}.n)=$(getField ${net}.bridge) \
        NODEREGISTRY_$(getField ${net}.n)=$(getField ${net}.nodeRegistry) \
        DEXPOOL_$(getField ${net}.n)=$(getField ${net}.mockDexPool) \
        PORTAL_$(getField ${net}.n)=$(getField ${net}.portal) \
        SYNTHESIS_$(getField ${net}.n)=$(getField ${net}.synthesis) \
        PAYMASTER_$(getField ${net}.n)=$(getField ${net}.paymaster) \
        EYWA_TOKEN_$(getField ${net}.n)=$(getField ${net}.eywa) \
        FORWARDER_$(getField ${net}.n)=$(getField ${net}.forwarder) \
        ROUTER_$(getField ${net}.n)=$(getField ${net}.router) \
      && echo $(getField ${net}.env_file[1])

      ./scripts/env2json_adapter.sh $(getField ${net}.env_file[0])
      ./scripts/env2json_adapter.sh $(getField ${net}.env_file[1])
  fi
done

if [ ! -z "$REGNET" -a "$PART" == "deploy_crosspool" -a "$STEP" != "init" ]; then
  npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network "$net"
  npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network "$regnet"
elif [ -z "$STEP" ]; then
  npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network network1
  npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network network3
  npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network network2
fi

if [ \( ! -z "$REGNET" -a "$PART" == "deploy_crosspool" -a "$STEP" != "init" \) -o -z "$REGNET" ]; then
  for net in ${nets//\,/ }
    do
    npx hardhat run --no-compile ./scripts/meta_exchange/deploy-local-pool.js --network ${net}
  done

  for net in ${nets//\,/ }
    do
    npx hardhat run --no-compile ./scripts/meta_exchange/deploy-hub-pool.js --network ${net}
  done
fi


if [ \( ! -z "$REGNET" -a "$STEP" == "init" \) -o -z "$REGNET" ]; then
  for net in ${nets//\,/ }; do
    echo 'init into:' ${net}
    npx hardhat balanceDeployer --network ${net}
    NETS=$nets npx hardhat run --no-compile ./scripts/amm_pool/createRepresentation.js --network ${net}
  done


  for net in ${nets//\,/ }; do
    npx hardhat balanceDeployer --network ${net}
    npx hardhat run --no-compile ./scripts/bridge/updateDexBind.js  --network ${net}
  done

  if [ ! -z "$REGNET" -a "$STEP" == "init" ]; then
     echo "NOTE: Temporary disabled 'dao deploy' !"
#    npx hardhat run --no-compile ./scripts/dao/deploy-dao.js --network ${regnet}
  elif [ -z "$STEP" ]; then
    npx hardhat run --no-compile ./scripts/dao/deploy-dao.js --network network2
  fi
fi
