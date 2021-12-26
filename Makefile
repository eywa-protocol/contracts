.DEFAULT_GOAL := wrappers

.PHONY: wrappers

ARTIFACTS="hardhat/artifacts/contracts"

all: wrappers

npm: copy_configs
	@if [ -d hardhat/node_modules ]; then \
			echo "installed"; \
			else \
			cd hardhat;npm ci; \
			fi;

wrappers: npm compile copy_configs
	go run wrappers-builder/main.go --json hardhat/artifacts/@openzeppelin/contracts-newone/token/ERC20/extensions/draft-ERC20Permit.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/bridge/Bridge.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/bridge/Forwarder.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/bridge/NodeRegistry.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/bridge/RelayerPool.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/bridge/mocks/MockDexPool.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/bridge/test/TestTarget.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/bridge/test/TestForward.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/bridge/test/TestERC20Permit.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/bridge/merkle/MerkleTest.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/amm_pool/Portal.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/amm_pool/Synthesis.sol --pkg wrappers --out ../wrappers

deps:
	go mod tidy
	go mod download

clean:
	rm -f ./wrappers/*.go
	cd hardhat;npx hardhat clean;


local-test:
	cd hardhat;npm run e2e:local;
testnet-test:
	cd hardhat;npm run e2e:testnet;

eth-local-migrate: deps npm wrappers
	cd hardhat;./scripts/deploy.sh network1,network2,network3

eth-testnet-migrate: deps npm wrappers
	cd hardhat;./scripts/deploy.sh rinkeby,bsctestnet,mumbai

copy_configs:
	cp ./hardhat/helper-hardhat-config.json.example ./hardhat/helper-hardhat-config.json;cp ./hardhat/.env.example ./hardhat/.env;

compile:
	cd hardhat;npx hardhat compile
