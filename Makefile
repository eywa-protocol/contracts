.DEFAULT_GOAL := wrappers

.PHONY: wrappers

all: wrappers

npm:
	@if [ -d hardhat/packages/bridge/node_modules ]; then \
  			echo "installed"; \
  			else \
  			cd hardhat;npm ci; \
                        cd packages/gasless;npm ci; \
                        cd ../amm_pool;npm ci; \
                        cd ../bridge;npm ci;fi;

wrappers: deps npm clean
	cd hardhat/packages/bridge;npx hardhat compile
	go run wrappers-builder/main.go --json hardhat/packages/bridge/artifacts/contracts/Bridge.sol --pkg wrappers --out wrappers
	go run wrappers-builder/main.go --json hardhat/packages/bridge/artifacts/contracts/Forwarder.sol --pkg wrappers --out wrappers
	go run wrappers-builder/main.go --json hardhat/packages/bridge/artifacts/contracts/NodeList.sol --pkg wrappers --out wrappers
	go run wrappers-builder/main.go --json hardhat/packages/bridge/artifacts/contracts/mocks/MockDexPool.sol --pkg wrappers --out wrappers
	go run wrappers-builder/main.go --json hardhat/packages/bridge/artifacts/contracts/test/TestTarget.sol --pkg wrappers --out wrappers

deps:
	go mod tidy
	go mod download

clean:
	rm -f ./wrappers/*.go
	cd hardhat/packages/bridge;npx hardhat clean;

#local-deploy: deps npm
#	cd truffle;npm run deploy:ganache;

local-test: deps npm
	cd hardhat/packages/bridge;npm run integration-test:local;

eth-local-migrate:
	cd hardhat/packages/bridge;yarn
	cd hardhat/scripts;./deploy.sh network1,network2,network3
