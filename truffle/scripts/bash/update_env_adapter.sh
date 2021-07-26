#! /bin/bash


echo "
RPC_URL=${1:-\"null\"}
NETWORK_ID=${2:-\"null\"}
BRIDGE_ADDRESS=${3:-\"null\"}
NODELIST_ADDRESS=${4:-\"null\"}
DEXPOOL_ADDRESS=${5:-\"null\"}"  > $6

echo "
BRIDGE_${7:-\"null\"}=${3:-\"null\"}
NODELIST_${7:-\"null\"}=${4:-\"null\"}
DEXPOOL_${7:-\"null\"}=${5:-\"null\"}"  > $8
