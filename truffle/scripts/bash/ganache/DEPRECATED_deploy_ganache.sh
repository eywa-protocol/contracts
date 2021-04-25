#!/usr/bin/env bash

#==========================
# Create Image
#==========================
image_and_tag="p2p-bridge_ganache_net1:latest p2p-bridge_ganache_net2:latest"
image_and_tag_array=(${image_and_tag//:/ })
if [[ "$(docker images ${image_and_tag_array[0]} | grep ${image_and_tag_array[1]} 2> /dev/null)" != "" ]]; then
  echo ">Images are exists=p2p-bridge_ganache_net1:latest p2p-bridge_ganache_net2:latest"
else
	docker build --file=../../../docker/network1/ganache/Dockerfile --tag=p2p-bridge_ganache_net1 . && \
	docker build --file=../../../docker/network2/ganache/Dockerfile --tag=p2p-bridge_ganache_net2 .
fi
#==========================
# Create bridge
#==========================
network_and_tag="bridge_p2p"
network_and_tag_array=(${network_and_tag//:/ })
if [[ "$(docker  network inspect  ${network_and_tag_array[0]} | grep ${network_and_tag_array[1]} 2> /dev/null)" != "[]" ]]; then
  echo ">Brigde bridge_p2p exists"
else
	docker network create --subnet=152.20.0.0/16 bridge_p2p
fi

#==========================
# Create containers
#==========================
container_and_tag="p2p-bridge_ganache_net1_1 p2p-bridge_ganache_net2_1"
container_and_tag_array=(${container_and_tag//:/ })
if [[ "$(docker container inspect  ${container_and_tag_array[0]}  2> /dev/null)" != "[]" ]]; then
  echo ">Restart containers"
  # docker rm -f p2p-bridge_ganache_net1_1 && docker rm -f p2p-bridge_ganache_net2_1 && \
#   docker run  -d --publish=754?5:7545 --network=bridge_p2p --ip=152.20.128.11 --rm=true --name=p2p-bridge_ganache_net1_1 p2p-bridge_ganache_net1 && \
#   docker run  -d --publish=8545:8545 --network=bridge_p2p --ip=152.20.128.12 --rm=true --name=p2p-bridge_ganache_net2_1 p2p-bridge_ganache_net2
else
	docker run  -d --publish=7545:7545 --network=bridge_p2p --ip=152.20.128.11 --rm=true --name=p2p-bridge_ganache_net1_1 p2p-bridge_ganache_net1 && \
	docker run  -d --publish=8545:8545 --network=bridge_p2p --ip=152.20.128.12 --rm=true --name=p2p-bridge_ganache_net2_1 p2p-bridge_ganache_net2
fi

rm -rf build/contracts && \
npx truffle migrate --reset --network network1 && npx truffle migrate --reset --network network2
