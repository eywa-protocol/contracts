#! /bin/bash

echo "
BRIDGE_${2:-\"null\"}=${3:-\"null\"}
NODELIST_${2:-\"null\"}=${5:-\"null\"}
DEXPOOL_${2:-\"null\"}=${6:-\"null\"}"  > $4

