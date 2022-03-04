// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

library ReqIdFilter {
    struct Data {
        mapping(bytes32 => bool) filter;
        bytes32[] used;
    }

    function length(Data storage data) internal returns(uint256) {
        return data.used.length;
    }

    function testAndSet(Data storage data, bytes32 id) internal returns(bool) {
        if (data.filter[id]) return true;
        data.filter[id] = true;
        data.used.push(id);
        return false;
    }

    function clear(Data storage data) internal {
        for (uint256 i = 0; i < data.used.length; i++) data.filter[data.used[i]] = false;
        delete data.used;
    }
}
