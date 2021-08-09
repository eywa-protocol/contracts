.DEFAULT_GOAL := wrappers

.PHONY: wrappers

ARTIFACTS="hardhat/artifacts/contracts/bridge"

all: wrappers

npm: copy_configs:q
	@if [ -d hardhat/node_modules ]; then \
  			echo "installed"; \
  			else \
  			cd hardhat;npm i; \
                        fi;

wrappers:
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


local-test: deps npm
	cd hardhat/contracts/bridge;npm run integration-test:local;

eth-local-migrate: deps npm wrappers
	cd hardhat/scripts;./deploy.sh network1,network2,network3

copy_configs:
	cp ./hardhat/helper-hardhat-config.json.example ./hardhat/helper-hardhat-config.json;cp ./hardhat/.env.example ./hardhat/.env;cd hardhat;npx hardhat compile
