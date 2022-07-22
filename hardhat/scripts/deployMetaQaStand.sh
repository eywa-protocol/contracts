nets="arbitrumtestnet bsctestnet mumbai avalanchetestnet fantomtestnet rinkeby harmonytestnet"

# deploy crosschain pool
npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network mumbai
npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network fantomtestnet
npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network bsctestnet
npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network avalanchetestnet
npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network rinkeby
npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network arbitrumtestnet
# npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network cronostestnet
npx hardhat run --no-compile ./scripts/meta_exchange/deploy-crosschain-pool.js --network harmonytestnet

# deploy local pool
npx hardhat run --no-compile ./scripts/meta_exchange/deploy-local-pool.js --network harmonytestnet

# deploy hub pool
npx hardhat run --no-compile ./scripts/meta_exchange/deploy-hub-pool.js --network harmonytestnet

# createRepresentation
for net in ${nets//\,/ }; do
    echo 'init into:' ${net}
    npx hardhat balanceDeployer --network ${net}
    NETS=$nets npx hardhat run --no-compile ./scripts/amm_pool/createRepresentation.js --network ${net}
done




# TEST
# for net in ${nets//\,/ }; do
    # npx hardhat balanceDeployer --network ${net}
    # npx hardhat run --no-compile ./scripts/bridge/updateDexBind.js  --network ${net}
# done
