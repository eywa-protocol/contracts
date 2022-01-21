## prerequisites
node >= 14
hardhat

`FOR DEVELOPERS:`

- We suppose that before execute './scripts/deploy.sh *' in helper-hardhat-config.json was set actual addresses: RelayHub, Forwarder, amm_pool, tokens and sourceForRepresentation. Current deploy flow is skipped the gns deploy file.
- If you want to deploy your own gns contracts (RelayHub etc) you have to uncomment the line in ./scripts/deploy.sh (look the 'NOTE' mark)

## DEPLOY

### testnet's deploy
```bash
cd hardhat
./scripts/deploy.sh rinkeby,bsctestnet,mumbai


### local deploy
```bash
cd hardhat
./scripts/deploy.sh network1,network2,network3
```

### Tests

- Local deploy and test should be triggered form https://gitlab.digiu.ai/blockchainlaboratory/eywa-p2p-bridge.

#### Tests for local
```bash
cp helper-hardhat-config.json.example helper-hardhat-config.json
cp .env.example .env
npx hardhat test
```

## Code Style

### Prettier

- For code slyle on .sol use 'npm run prettier'

### Git

- For pretty commit are suggested to use 'npm run commit' after git add

