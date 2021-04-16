pragma solidity =0.6.9;



library Other {

	function toAsciiString(address x) internal view returns (string memory) {
	    bytes memory s = new bytes(40);
	    for (uint i = 0; i < 20; i++) {
	        bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19 - i)))));
	        bytes1 hi = bytes1(uint8(b) / 16);
	        bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
	        s[2*i] = char(hi);
	        s[2*i+1] = char(lo);
	    }
	    return string(s);
	}

	function bytesToHexString(bytes memory data) internal pure returns (string memory s) {
		bytes memory alphabet = "0123456789abcdef";
		bytes memory result = new bytes(data.length * 2);
		for (uint i = 0; i < data.length; i++) {
			result[i*2] = alphabet[uint(uint8(data[i] >> 4))];
			result[1+i*2] = alphabet[uint(uint8(data[i] & 0x0f))];
		}
		return string(result);
	}

	function char(bytes1 b) internal view returns (bytes1 c) {
	    if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
	    else return bytes1(uint8(b) + 0x57);
	}
}
