#! /bin/bash

source $(pwd)/scripts/import.sh

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
  $(pwd)/scripts/configs.sh ${net}
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
    $(pwd)/scripts/configs.sh ${net}

  fi
done

if [ ! -z "$REGNET" -a "$PART" == "deploy_crosspool" -a "$STEP" != "init" ]; then
  npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network "$net"
  npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network "$regnet"
elif [ -z "$STEP" ]; then
  npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network network1
  npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network network3
  npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network network2
  npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network harmonylocal
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


