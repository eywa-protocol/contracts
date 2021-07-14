#!/usr/bin/env bash

## from scratch
# npx truffle migrate --reset --network rinkeby
# npx truffle migrate --reset --network bsctestnet

## if you want to deploy part of smart contracts use to flags
npx truffle migrate --reset --network rinkeby  \
 --bridge 0x58182e36006a201C8C3f02B2010ba9EE2863626d \
 --nodelist 0xac1648149d10EBA6546De513010138012b503e72 \
 --mockdexpool 0xac1648149d10EBA6546De513010138012b503e72 \
 --paymastergsn 0x2e5757D5A56479863b71BC745E06b7F13a3a6b71

npx truffle migrate --reset --network bsctestnet \
 --bridge 0x3486a8889D92768a078feaB12608ff3a6e186AC3 \
 --nodelist 0xb69787dc29FbeFa2aD7F03cf4d3BDd81a48BdbBF \
 --mockdexpool 0xb69787dc29FbeFa2aD7F03cf4d3BDd81a48BdbBF \
 --paymastergsn 0x8509ab39cdB4442Efe3584f2032Fff2aa6F25BDC
