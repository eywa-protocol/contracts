## prerequisites
node >= 14
hardhat

`FOR DEVELOPERS:`
1. Copy /hardhat/helper-hardhat-config.json.example to /hardhat/helper-hardhat-config.json
2. Copy .env.example to .env and update its
3. If you update contracts for all users in test networks (not local networks!!! for rinkeby, mumbai, bsctestnet and etc) you should update "helper-hardhat-config.json.example" file.

All adjustments for deploy on LOW LEVEL, should set in ./helper-hardhat-config.json. The main idea if address of field in json does not present that means contract will be depoyed again.
- if you want deploy gasless (where owner of gsn node is opengsn) you must clear address of field paymaster.
- if you want deploy bridge contract (+ mockdexpool and nodeList) you must clear address of one of them.
- if you want deploy portal/bridge contract you must clear address one of them.


## Details of init process (after deploy)

- every bridge contract should know who can invoke it ()
- every synthesis contaract should createRepresantation

## DEPLOY

### test net deploy
```bash
cd hardhat/scripts
# if you invoke command without networks, for ex. ./deploy.sh at this time, under hood the script will looking empty addresses (see 'FOR DEVELOPERS') and deploy this contratcs
./deploy.sh rinkeby,bsctestnet,mumbai
```

### local deploy
1. start ganaches (3 endpoint), addresses see in helper config
2. do next commands
```bash
cd hardhat/scripts
# if you invoke command without networks, for ex. ./deploy.sh at this time, under hood the script will looking empty addresses (see 'FOR DEVELOPERS') and deploy this contratcs
./deploy.sh network1,network2,network3
```

## TEST

todo
move e2e from truffle

