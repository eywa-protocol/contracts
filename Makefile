.DEFAULT_GOAL := wrappers

.PHONY: wrappers

all: wrappers

npm:
	@if [ -d truffle/node_modules ]; then \
  			echo "installed"; \
  			else \
  			cd truffle;npm ci;fi

wrappers: clean deps npm
	cd truffle;yarn compile7;yarn compile8;
	go run wrappers-builder/main.go --json truffle/build/contracts --pkg wrappers --out wrappers

deps:
	go mod tidy
	go mod download

clean:
	rm -f ./wrappers/*.go
	rm -f ./truffle/build/contracts/*.json
	rm -f ./truffle/build/gsn/*.json

local-deploy: deps npm
	cd truffle;npm run deploy:ganache;

local-test: deps npm
	cd truffle;npm run integration-test:local;

eth-local-migrate: gsn wrappers
	cd truffle;npx truffle migrate --reset --network network1 && npx truffle migrate --reset --network network2 && npx truffle migrate --reset --network network3
gsn:
	cd truffle;yarn gsn &

migrate: gsn
	cd truffle;npx truffle deploy --network network2;

