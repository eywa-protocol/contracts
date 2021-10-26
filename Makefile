.DEFAULT_GOAL := wrappers

.PHONY: wrappers

ARTIFACTS="hardhat/artifacts/contracts/bridge"

all: wrappers

npm: copy_configs
	@if [ -d hardhat/node_modules ]; then \
  			echo "installed"; \
  			else \
  			cd hardhat;npm ci; \
                        fi;

wrappers: npm compile copy_configs
	go run wrappers-builder/main.go --json ${ARTIFACTS}/Bridge.sol --pkg wrappers --out wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/Forwarder.sol --pkg wrappers --out wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/NodeList.sol --pkg wrappers --out wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/mocks/MockDexPool.sol --pkg wrappers --out wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/test/TestTarget.sol --pkg wrappers --out wrappers

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
	cd hardhat;./scripts/deploy.sh ${NETWORKS}

copy_configs:
	cp ./hardhat/helper-hardhat-config.json.example ./hardhat/helper-hardhat-config.json;cp ./hardhat/.env.example ./hardhat/.env;

compile:
	cd hardhat;npx hardhat compile
