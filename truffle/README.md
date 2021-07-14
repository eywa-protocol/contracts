
##Deploy

###Ganache
- npm run deploy:ganache

###TESTNET

```bash
# before you should mint token on your user account and add private key in ./.env
cd truffle
truffle compile --config=truffle-config.v07.js && truffle compile 
npm run e2e-synthesis:testnetV2
```


## TEST

- npm run integration-test:local