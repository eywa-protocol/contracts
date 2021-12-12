#! /bin/bash

nets="network1 network2 network3"

for net in ${nets//\,/ }
  do
  npx hardhat run --no-compile ./scripts/meta_exchange/add-liquidity-eth-pool.js  --network ${net}
done

for net in ${nets//\,/ }
  do
  npx hardhat run --no-compile ./scripts/meta_exchange/add-liquidity-local-pool.js  --network ${net}
done

for net in ${nets//\,/ }
  do
  npx hardhat run --no-compile ./scripts/meta_exchange/transfer-liquidity-crosschain-pool.js  --network ${net}
done

for net in ${nets//\,/ }
  do
  npx hardhat run --no-compile ./scripts/meta_exchange/add-liquidity-crosschain-pool.js  --network ${net}
done