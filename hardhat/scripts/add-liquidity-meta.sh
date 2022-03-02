#! /bin/bash

nets="network1 network3 network2"

for net in ${nets//\,/ }
  do
  npx hardhat run --no-compile ./scripts/meta_exchange/add-liquidity-crosschain-pool.js  --network ${net}
done

for net in ${nets//\,/ }
  do
  npx hardhat run --no-compile ./scripts/meta_exchange/add-liquidity-hub-pool.js  --network ${net}
done

for net in ${nets//\,/ }
  do
  npx hardhat run --no-compile ./scripts/meta_exchange/add-liquidity-local-pool.js  --network ${net}
done

# get LP from CC pools for deposit to gauge
for net in ${nets//\,/ }
  do
  npx hardhat run --no-compile ./scripts/meta_exchange/add-liquidity-crosschain-pool.js  --network ${net}
done
