// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract EywaNft is ERC721PresetMinterPauserAutoId {
    string private _name = "EYWA-NFT";
    string private _symbol = "EYWA";
    string private _baseTokenURI = "https://gateway.pinata.cloud/ipfs/";

    constructor() ERC721PresetMinterPauserAutoId(_name, _symbol, _baseTokenURI) {
    }

}