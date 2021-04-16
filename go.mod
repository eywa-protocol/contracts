module github.com/digiu-ai/eth-contracts

go 1.16

replace github.com/digiu-ai/eth-contracts => ./

require (
	github.com/ethereum/go-ethereum v1.10.2
	github.com/sirupsen/logrus v1.8.1
	gopkg.in/urfave/cli.v1 v1.20.0
)
