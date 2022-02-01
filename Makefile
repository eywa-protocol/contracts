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
	--json ${ARTIFACTS}/bridge/merkle/MerkleTest.sol --pkg wrappers --out ../wrappers
	./wrappers-builder/wrappers-builder --json ${ARTIFACTS}/amm_pool/Portal.sol --pkg portal --out ../wrappers/portal
	./wrappers-builder/wrappers-builder --json ${ARTIFACTS}/amm_pool/Synthesis.sol --pkg synthesis --out ../wrappers/synthesis
	# go run wrappers-builder/main.go --json ${ARTIFACTS}/gassless/ImportArtifacts.sol --pkg gassless --out ../wrappers/gassless
	#cd wrappers-builder-gsn && go build && cd ..
	#./wrappers-builder-gsn/wrappers-builder-gsn --json ${ARTIFACTS}/bridge/Bridge.sol --pkg bridge --out ../wrappers/gsn/bridge
	#./wrappers-builder-gsn/wrappers-builder-gsn --json ${ARTIFACTS}/bridge/NodeRegistry.sol --pkg registry --out ../wrappers/gsn/registry
	#./wrappers-builder-gsn/wrappers-builder-gsn --json ${ARTIFACTS}/bridge/test/TestForward.sol --pkg test --out ../wrappers/gsn/test

wrappers-gsn:
	#cd wrappers-builder-gsn && go build && cd ..
	#./wrappers-builder-gsn/wrappers-builder-gsn --json ${ARTIFACTS}/bridge/Bridge.sol --pkg bridge --out ../wrappers/gsn/bridge
	#./wrappers-builder-gsn/wrappers-builder-gsn --json ${ARTIFACTS}/bridge/NodeRegistry.sol --pkg registry --out ../wrappers/gsn/registry
	#./wrappers-builder-gsn/wrappers-builder-gsn --json ${ARTIFACTS}/bridge/test/TestForward.sol --pkg test --out ../wrappers/gsn/test

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
	cd hardhat;./scripts/deploy.sh bsctestnet,avalanchetestnet,mumbai,hecotestnet,rinkeby

copy_configs:
	cp ./hardhat/helper-hardhat-config.json.example ./hardhat/helper-hardhat-config.json;cp ./hardhat/.env.example ./hardhat/.env;

compile:
	cd hardhat;npx hardhat compile
