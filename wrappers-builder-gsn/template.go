// Copyright 2016 The go-ethereum Authors
// This file is part of the go-ethereum library.
//
// The go-ethereum library is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// The go-ethereum library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with the go-ethereum library. If not, see <http://www.gnu.org/licenses/>.

package main

import "github.com/ethereum/go-ethereum/accounts/abi"

// tmplData is the data structure required to fill the binding template.
type tmplData struct {
	Package   string                   // Name of the package to place the generated file in
	Contracts map[string]*tmplContract // List of contracts to generate into this file
	Libraries map[string]string        // Map the bytecode's link pattern to the library name
	Structs   map[string]*tmplStruct   // Contract struct type definitions
}

// tmplContract contains the data needed to generate an individual contract binding.
type tmplContract struct {
	Type        string                 // Type name of the main contract binding
	InputABI    string                 // JSON ABI used as the input to generate the binding from
	InputBin    string                 // Optional EVM bytecode used to generate deploy code from
	FuncSigs    map[string]string      // Optional map: string signature -> 4-byte signature
	Constructor abi.Method             // Contract constructor for deploy parametrization
	Calls       map[string]*tmplMethod // Contract calls that only read state data
	Transacts   map[string]*tmplMethod // Contract calls that write state data
	Fallback    *tmplMethod            // Additional special fallback function
	Receive     *tmplMethod            // Additional special receive function
	Events      map[string]*tmplEvent  // Contract events accessors
	Libraries   map[string]string      // Same as tmplData, but filtered to only keep what the contract needs
	Library     bool                   // Indicator whether the contract is a library
}

// tmplMethod is a wrapper around an abi.Method that contains a few preprocessed
// and cached data fields.
type tmplMethod struct {
	Original   abi.Method // Original method as parsed by the abi package
	Normalized abi.Method // Normalized version of the parsed method (capitalized names, non-anonymous args/returns)
	Structured bool       // Whether the returns should be accumulated into a struct
}

// tmplEvent is a wrapper around an abi.Event that contains a few preprocessed
// and cached data fields.
type tmplEvent struct {
	Original   abi.Event // Original event as parsed by the abi package
	Normalized abi.Event // Normalized version of the parsed fields
}

// tmplField is a wrapper around a struct field with binding language
// struct type definition and relative filed name.
type tmplField struct {
	Type    string   // Field type representation depends on target binding language
	Name    string   // Field name converted from the raw user-defined field name
	SolKind abi.Type // Raw abi type information
}

// tmplStruct is a wrapper around an abi.tuple and contains an auto-generated
// struct name.
type tmplStruct struct {
	Name   string       // Auto-generated struct name(before solidity v0.5.11) or raw name.
	Fields []*tmplField // Struct fields definition depends on the binding language.
}

// tmplSource is language to template mapping containing all the supported
// programming languages the package can generate to.
var tmplSource = map[Lang]string{
	LangGo: tmplSourceGo,
}

// tmplSourceGo is the Go source template that the generated Go contract binding
// is based on.
const tmplSourceGo = `
// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package {{.Package}}

import (
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/eywa-protocol/wrappers"
	"github.com/eywa-protocol/wrappers/gsn"
	"github.com/sirupsen/logrus"
)

{{$structs := .Structs}}
{{range $contract := .Contracts}}
	{{range .Transacts}}
		func GsnBridge{{.Normalized.Name}}(
			__gsnCaller gsn.GsnCaller,
			__chainId *big.Int,
			__signer *ecdsa.PrivateKey,
			__contractAddress common.Address {{range .Normalized.Inputs}}, {{.Name}} {{bindtype .Type $structs}} {{end}})	(txHash common.Hash, err error) {

			__contractABI, err := abi.JSON(strings.NewReader(wrappers.BridgeABI))
			if err != nil {
				return common.Hash{}, fmt.Errorf("could not parse ABI: %w", err)
			}
		
			__fRequest, err := __contractABI.Pack("{{.Original.Name}}" {{range .Normalized.Inputs}}, {{.Name}} {{end}})
			if err != nil {
				return
			}
		
			__forwarder, err := __gsnCaller.GetForwarder(__chainId)
			if err != nil {
				return
			}
		
			__forwarderAddress, err := __gsnCaller.GetForwarderAddress(__chainId)
			if err != nil {
				return
			}
		
			logrus.Infof("forwarderAddress: %s", __forwarderAddress.String())
			logrus.Infof("nodeRegistryAddress: %s", __contractAddress.String())
		
			__signerAddress := crypto.PubkeyToAddress(__signer.PublicKey)
		
			logrus.Infof("ownerAddress: %s", __signerAddress.String())
		
			__nonce, err := __forwarder.GetNonce(&bind.CallOpts{}, __signerAddress)
			if err != nil {
		
				return
			}
		
			__req := &wrappers.IForwarderForwardRequest{
				From:  __signerAddress,
				To:    __contractAddress,
				Value: big.NewInt(0),
				Gas:   big.NewInt(1e6),
				Nonce: __nonce,
				Data:  __fRequest,
			}
		
			__typedData, err := gsn.NewForwardRequestTypedData(
				__req,
				__forwarderAddress.String(),
				wrappers.BridgeABI,
				"{{.Original.Name}}" {{range .Normalized.Inputs}}, {{.Name}} {{end}})
			if err != nil {
				return
			}
		
			__typedDataSignature, _, err := gsn.NewSignature(__typedData, __signer)
			if err != nil {
		
				return
			}
		
			__domainSeparatorHash, err := gsn.NewDomainSeparatorHash(__typedData)
			if err != nil {
		
				return
			}
		
			__genericParams, err := __forwarder.GENERICPARAMS(&bind.CallOpts{})
			if err != nil {
		
				return
			}
		
			__reqTypeHash, err := gsn.NewRequestTypeHash(__genericParams)
			if err != nil {
		
				return
			}
		
			return __gsnCaller.Execute(__chainId, *__req, __domainSeparatorHash, __reqTypeHash, nil, __typedDataSignature)
		}
	{{end}}
{{end}}
`
