.DEFAULT_GOAL := wrappers

.PHONY: wrappers

npm:
	@if [ -d truffle/node_modules ]; then \
  			echo "installed"; \
  			else \
  			cd truffle;npm i;fi

wrappers: deps npm
	cd truffle;npm run deploy:ganache;
	go run wrappers-builder/main.go --json truffle/build/contracts --pkg wrappers --out wrappers

deps:
	go mod tidy
	go mod download

clean:
	rm ./wrappers/*.go
	rm ./truffle/build/contracts/*.json
