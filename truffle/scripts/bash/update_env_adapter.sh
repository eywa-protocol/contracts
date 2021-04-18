#! /bin/bash

echo  "# env for connect to ${2:-\"null\"}
PORT=${1:-\"null\"}
BRIDGE_ADDRESS_${2:-\"null\"}=${3:-\"null\"}
PROXY_${2:-\"null\"}=${4:-\"null\"}
PROXY_ADMIN_${2:-\"null\"}=${5:-\"null\"}"  > $6