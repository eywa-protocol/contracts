#! /bin/bash

source $(pwd)/scripts/import.sh

nets=${1}
if [[ ${1} =~ ^('')$ ]]; then
  nets=$(jq 'keys[]' ./helper-hardhat-config.json)
  nets=${nets//\"/ }
  echo '> Create (override) env files only'
  for net in ${nets//\,/ }; do
    getNetRpcUrl $net
    ./scripts/update_env_adapter.sh create $(getField ${net}.env_file[0])  \
      RPC_URL=${RPC_URL:-$(getField ${net}.rpcUrl)} \
      WS_URL=${WS_URL:-"undefined"} \
      NETWORK_ID=$(getField ${net}.chainId) \
      NETWORK_NAME=${net} \
      BRIDGE_ADDRESS=$(getField ${net}.bridge) \
      DEXPOOL_ADDRESS=$(getField ${net}.mockDexPool) \
      PORTAL_ADDRESS=$(getField ${net}.portal) \
      SYNTHESIS_ADDRESS=$(getField ${net}.synthesis) \
      PAYMASTER_ADDRESS=$(getField ${net}.paymaster) \
      EYWA_TOKEN_ADDRESS=$(getField ${net}.eywa) \
      TEST_TOKEN_ADDRESS=$(getField ${net}.token[0].address) \
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
  done
  exit 0
fi

regnet="${REGNET:-$(cut -d "," -f1 <<<$nets)}"
for net in ${nets//\,/ }; do
echo 'bash script for network:' ${net}
echo '==========================================='
echo ''

      echo "It's not run"
      getNetRpcUrl $net
      ./scripts/update_env_adapter.sh create $(getField ${net}.env_file[0])  \
        RPC_URL=$RPC_URL \
        WS_URL=$WS_URL \
        NETWORK_ID=$(getField ${net}.chainId) \
        NETWORK_NAME=${net} \
        BRIDGE_ADDRESS=$(getField ${net}.bridge) \
        NODEREGISTRY_ADDRESS=$(getField ${net}.nodeRegistry) \
        DEXPOOL_ADDRESS=$(getField ${net}.mockDexPool) \
        PORTAL_ADDRESS=$(getField ${net}.portal) \
        SYNTHESIS_ADDRESS=$(getField ${net}.synthesis) \
        PAYMASTER_ADDRESS=$(getField ${net}.paymaster) \
        EYWA_TOKEN_ADDRESS=$(getField ${net}.eywa) \
        TEST_TOKEN_ADDRESS=$(getField ${net}.token[0].address) \
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
done
