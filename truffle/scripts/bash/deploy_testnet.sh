#!/usr/bin/env bash

docker-compose -f ./testnet-docker-compose.yaml stop && docker-compose -f ./testnet-docker-compose.yaml rm && rm -rf build/contracts && \
npx truffle migrate --reset --network rinkeby && npx truffle migrate --reset --network bsctestnet && \
docker-compose -f ./testnet-docker-compose.yaml up -d && docker-compose -f ./testnet-docker-compose.yaml ps
