#! /bin/bash

echo "
BRIDGE_ADDRESS_${2:-\"null\"}=${3:-\"null\"}
PROXY_${2:-\"null\"}=${4:-\"null\"}
PROXY_ADMIN_${2:-\"null\"}=${5:-\"null\"}
NODELIST_${2:-\"null\"}=${7:-\"null\"}"  > $6