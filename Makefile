.DEFAULT_GOAL := wrappers

.PHONY: wrappers

WRAPPERS ?= ../wrappers
HMYWRAPPERS ?= ../hmy-wrappers
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
	--json ${ARTIFACTS}/amm_pool/Router.sol \
	--json ${ARTIFACTS}/amm_pool/Portal.sol \
	--json ${ARTIFACTS}/amm_pool/Synthesis.sol \
	--json ${ARTIFACTS}/test/MerkleTest.sol \
	--json ${ARTIFACTS}/test/BlockTest.sol \
	--pkg wrappers --out ${WRAPPERS}
	./wrappers-builder/wrappers-builder --t harmony --json hardhat/artifacts/@openzeppelin/contracts-newone/token/ERC20/extensions/draft-ERC20Permit.sol \
	--json ${ARTIFACTS}/bridge/Bridge.sol \
	--json ${ARTIFACTS}/bridge/Forwarder.sol \
	--json ${ARTIFACTS}/bridge/NodeRegistry.sol \
	--json ${ARTIFACTS}/bridge/RelayerPool.sol \
	--json ${ARTIFACTS}/bridge/mocks/MockDexPool.sol \
	--json ${ARTIFACTS}/bridge/test/TestTarget.sol \
	--json ${ARTIFACTS}/bridge/test/TestForward.sol \
	--json ${ARTIFACTS}/bridge/test/TestERC20Permit.sol \
	--json ${ARTIFACTS}/amm_pool/Router.sol \
	--json ${ARTIFACTS}/amm_pool/Portal.sol \
	--json ${ARTIFACTS}/amm_pool/Synthesis.sol \
	--json ${ARTIFACTS}/test/MerkleTest.sol \
	--json ${ARTIFACTS}/test/BlockTest.sol \
	--pkg hmy --out ${HMYWRAPPERS}

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

eth-hmy-migrate: deps npm wrappers
	cd hardhat;./scripts/deploy.sh harmonylocal

eth-local-migrate: deps npm wrappers
	cd hardhat;./scripts/deploy.sh harmonylocal,network2,network1,network3

eth-local-migrate-core: deps npm wrappers
	cd hardhat; REGNET="harmonylocal" PART="deploy_bridge" STEP="deploy" ./scripts/deploy.sh harmonylocal,network2,network1,network3;
	cd hardhat; REGNET="harmonylocal" PART="" STEP="init" ./scripts/deploy.sh harmonylocal,network2,network1,network3;

eth-testnet-migrate-core: deps npm wrappers
	cd hardhat; REGNET="harmonytestnet" PART="deploy_bridge" STEP="deploy" ./scripts/deploy.sh harmonytestnet,mumbai,bsctestnet;
	cd hardhat; REGNET="harmonytestnet" PART="" STEP="init" ./scripts/deploy.sh harmonytestnet,mumbai,bsctestnet

eth-testnet-migrate: deps npm wrappers
	cd hardhat;./scripts/deploy.sh harmonytestnet,mumbai,bsctestnet,avalanchetestnet,hecotestnet,rinkeby

eth-testnet-ci-migrate: debug deps npm wrappers
	echo "${NETWORKS}";
	cd hardhat;./scripts/deploy.sh ${NETWORKS}

debug:
	echo "${NETWORKS}"

copy_configs:
	@if [ -z ${NETWORKS} ]; then \
			cp ./hardhat/helper-hardhat-config.json.example ./hardhat/helper-hardhat-config.json;cp ./hardhat/.env.example ./hardhat/.env; \
			else \
			cp ./hardhat/.env.example ./hardhat/.env; \
			fi;


compile:
	cd hardhat;npx hardhat compile

get-block:
	cd hardhat;npx hardhat getBlockNum --network $(NET)
