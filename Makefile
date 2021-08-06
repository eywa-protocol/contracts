.DEFAULT_GOAL := wrappers

.PHONY: wrappers


ARTIFACTS="hardhat/artifacts/contracts/bridge"

all: wrappers

npm:
	@if [ -d hardhat/node_modules ]; then \
  			echo "installed"; \
  			else \
  			cd hardhat;npm i; \
                        fi;

wrappers: clean npm
	cd hardhat;npx hardhat compile
	go run wrappers-builder/main.go --json ${ARTIFACTS}/Bridge.sol --pkg wrappers --out wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/Forwarder.sol --pkg wrappers --out wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/NodeList.sol --pkg wrappers --out wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/mocks/MockDexPool.sol --pkg wrappers --out wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/test/TestTarget.sol --pkg wrappers --out wrappers

deps:
	go mod tidy
	go mod download

clean: npm
	rm -f ./wrappers/*.go
	cd hardhat;npx hardhat clean;

#local-deploy: deps npm
#	cd truffle;npm run deploy:ganache;

local-test: deps npm
	cd hardhat/contracts/bridge;npm run integration-test:local;

eth-local-migrate:
	cd hardhat/scripts;./deploy.sh network1,network2,network3
