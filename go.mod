module gitlab.digiu.ai/blockchainlaboratory/eywa-contracts

go 1.16

require (
	eywa-accounts v0.0.0-00010101000000-000000000000 // indirect
	github.com/ethereum/go-ethereum v1.10.3
	github.com/sirupsen/logrus v1.8.1
	gopkg.in/urfave/cli.v1 v1.20.0
)

replace gitlab.digiu.ai/blockchainlaboratory/eywa-contracts => ../

replace eywa-accounts => ./accounts

//replace github.com/ethereum/go-ethereum/accounts =>
