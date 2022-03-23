// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./LotteryErrors.sol";


contract Lottery {
    /// @dev Ticket is 1 word packet tuple of address and weight 
    struct Ticket {
        uint96 weight;
        uint160 id;
    }

    /// @dev tidly packet array of candidates
    Ticket[] public candidates;

    // Map of already known candidates
    mapping (address => bool) name;

    constructor() {}

    function totalWeight() public view returns (uint96) {
        if (candidates.length == 0 ) {
            return 0;
        } else {
            return candidates[candidates.length].weight;
        }
    }

    function drawTicket(uint96 weight, uint160 id) public {
        require(weight > 0, LotteryErrors.ZERO_WEIGHT);
        candidates.push(Ticket(totalWeight() + weight, id));
    }

    function _binarySearch(uint96 weight) internal returns (uint256 mid) {
		uint256 low = 0;
		uint256 top = candidates.length - 1;
		mid = low + (top - low) / 2;
        while(low < top) {
			// If the weight belongs to the current bucket
			if (candidates[mid].weight == weight || (candidates[mid].weight > weight && int(mid) - 1 >= int(0) && candidates[mid - 1].weight < weight)) 
				break;

			// If the weight belongs to the bucket on the right
			else if (candidates[mid].weight < weight && candidates[mid + 1].weight >= weight) {
				mid = mid + 1;
				break;
			}

			// Search in the right half by updating the lo index
			else if (candidates[mid].weight < weight) low = mid + 1;

			// Search in the left half by updating the hi index
			else top = mid - 1;

			// Compute the new mid
			mid = low + (top - low) / 2;
        }
    } 

    function _pickNext(uint256 rand) internal returns (Ticket memory candidate) {
        uint96 weight = uint96(rand % totalWeight());
        return candidates[_binarySearch(weight)];
    }

    function getSnapshot(uint256 max, uint256 rand) public returns (address[] memory) {
        uint len = candidates.length;
        len = max > len ? len : max;
        address[] memory winners = new address[](len);

        for (uint index = 0; index < len; index++) {
            unchecked { rand = rand*6364136223846793005 + 1442695040888963407; }   // TODO unsafe
            winners[index] = address(_pickNext(rand).id);
        }

        return winners;
    }
}