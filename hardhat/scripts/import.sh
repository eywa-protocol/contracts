#! /bin/bash

helper_path="${HHC_PATH:-./helper-hardhat-config.json}"

getField(){
 node -pe 'JSON.parse(process.argv[1]).'$1 "$(cat $helper_path)"
}


getNetRpcUrl(){
  case $1 in
  "harmonylocal")
  RPC_URL=$(getField ${net}.rpcUrl2)
  WS_URL=$(getField ${net}.rpcUrl)
  ;;
  *)
  RPC_URL=$(getField ${net}.rpcUrl)
  ;;
  esac
}
