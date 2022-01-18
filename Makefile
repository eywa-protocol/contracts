.DEFAULT_GOAL := wrappers

.PHONY: wrappers

ARTBASE="hardhat/artifacts/contracts"
ARTIFACTS="hardhat/artifacts/contracts/bridge"

all: wrappers

npm: copy_configs
	@if [ -d hardhat/node_modules ]; then \
			echo "installed"; \
			else \
			cd hardhat;npm ci; \
			fi;

wrappers: npm compile copy_configs
	go run wrappers-builder/main.go --json hardhat/artifacts/@openzeppelin/contracts-newone/token/ERC20/extensions/draft-ERC20Permit.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/Bridge.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/Forwarder.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/NodeRegistry.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/RelayerPool.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/mocks/MockDexPool.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/test/TestTarget.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/test/TestForward.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/test/TestERC20Permit.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTIFACTS}/merkle/MerkleTest.sol --pkg wrappers --out ../wrappers
	go run wrappers-builder/main.go --json ${ARTBASE}/amm_pool/Portal.sol --pkg portal --out ../wrappers/portal
	go run wrappers-builder/main.go --json ${ARTBASE}/amm_pool/Synthesis.sol --pkg synthesis --out ../wrappers/synthesis
deps:
	go mod tidy
	go mod download

wrappers-gsn: npm compile copy_configs
	cd wrappers-builder-gsn && go build && cd ..
	./wrappers-builder-gsn/wrappers-builder-gsn --json ${ARTIFACTS}/Bridge.sol --pkg bridge --out ../wrappers/gsn/bridge

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
	cd hardhat;./scripts/deploy.sh bsctestnet,avalanchetestnet,mumbai,hecotestnet,rinkeby

copy_configs:
	cp ./hardhat/helper-hardhat-config.json.example ./hardhat/helper-hardhat-config.json;cp ./hardhat/.env.example ./hardhat/.env;

compile:
	cd hardhat;npx hardhat compile
