.DEFAULT_GOAL := wrappers

.PHONY: wrappers

WRAPPERS ?= ../wrappers
ARTIFACTS ?= hardhat/artifacts/contracts
all: wrappers
        : '$(WRAPPERS)'

npm: copy_configs
	@if [ -d hardhat/node_modules ]; then \
			echo "installed"; \
			else \
			cd hardhat;npm ci; \
			fi;

wrappers: npm compile copy_configs
	echo "path ${WRAPPERS}"
	cd wrappers-builder && go build && cd ..
	./wrappers-builder/wrappers-builder --json hardhat/artifacts/@openzeppelin/contracts-newone/token/ERC20/extensions/draft-ERC20Permit.sol \
	--json ${ARTIFACTS}/bridge/Bridge.sol \
	--json ${ARTIFACTS}/bridge/Forwarder.sol \
	--json ${ARTIFACTS}/bridge/NodeRegistry.sol \
	--json ${ARTIFACTS}/bridge/RelayerPool.sol \
	--json ${ARTIFACTS}/bridge/mocks/MockDexPool.sol \
	--json ${ARTIFACTS}/bridge/test/TestTarget.sol \
	--json ${ARTIFACTS}/bridge/test/TestForward.sol \
	--json ${ARTIFACTS}/bridge/test/TestERC20Permit.sol \
	--json ${ARTIFACTS}/bridge/merkle/MerkleTest.sol \
	--json ${ARTIFACTS}/amm_pool/Portal.sol \
	--json ${ARTIFACTS}/amm_pool/Synthesis.sol \
	--pkg wrappers --out ${WRAPPERS}

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
	cd hardhat;./scripts/deploy.sh network2,network1,network3

eth-testnet-migrate: deps npm wrappers
	cd hardhat;./scripts/deploy.sh mumbai,bsctestnet,avalanchetestnet,hecotestnet,rinkeby

eth-testnet-ci-migrate: deps npm wrappers
	cd hardhat;./scripts/deploy.sh ${NETWORKS}

copy_configs:
	@if [ -z ${NETWORKS} ]; then \
			cp ./hardhat/helper-hardhat-config.json.example ./hardhat/helper-hardhat-config.json;cp ./hardhat/.env.example ./hardhat/.env; \
			else \
			echo "nothing to do" \
			fi;

compile:
	cd hardhat;npx hardhat compile
