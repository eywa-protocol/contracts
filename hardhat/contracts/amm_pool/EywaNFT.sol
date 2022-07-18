// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-newone/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts-newone/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts-newone/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts-newone/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-newone/access/Ownable.sol";
import "@openzeppelin/contracts-newone/utils/Strings.sol";
import "@openzeppelin/contracts-newone/utils/cryptography/MerkleProof.sol";
import "./Vesting.sol";


contract EywaNFT is ERC721Enumerable, Ownable, ERC721Burnable {
    using SafeERC20 for IERC20;
    using Strings for uint256;

    address TREASURY = 0x0000000000000000000000000000000000000000;

    uint256 public immutable CLIFF_PERCENT = 10;

    uint256 private TIER_ONE_START = 1;
    uint256 private TIER_ONE_SUPPLY = 25082;
    uint256 private TIER_ONE_MIN_SCORE = 110;
    uint256 private TIER_ONE_MAX_SCORE = 2000;
    uint256[25082] private tierOneArray;
    uint256 private tierOneIndex;

    uint256 private TIER_TWO_START = 25083;
    uint256 private TIER_TWO_SUPPLY = 23866;
    uint256 private TIER_TWO_MAX_SCORE = 3000;
    uint256[23866] private tierTwoArray;
    uint256 private tierTwoIndex;

    uint256 private TIER_THREE_START = 48950;
    uint256 private TIER_THREE_SUPPLY = 3678;
    uint256 private TIER_THREE_MAX_SCORE = 5000;
    uint256[3678] private tierThreeArray;
    uint256 private tierThreeIndex;

    uint256 private TIER_FOUR_START = 52629;
    uint256 private TIER_FOUR_SUPPLY = 401;
    uint256 private TIER_FOUR_MAX_SCORE = 100000;
    uint256[401] private tierFourArray;
    uint256 private tierFourIndex;

    uint256 private TEAM_START = 55000;
    uint256 private teamIndex = 0;

    bool public claimingActive;
    bool public vestingActive;
    bool public saleActive;
    bool public teamClaimed;

    uint256 private allocation;
    uint256 private totalScore;
    bytes32 private merkleRoot;
    string private baseURI;

    mapping(uint256 => uint8) private tokenStatus;
    mapping(uint256 => uint256) private claimableAmount;

    EywaVesting public vestingContract;

    event UnclaimedMint(address indexed to, uint256 indexed tokenId, uint256 score);
    event Mint(address indexed to, uint256 indexed tokenId, uint256 score);


    constructor(
        string memory name,
        string memory symbol,
        uint256 _allocation,
        uint256 _totalScore
    ) ERC721(name, symbol) {
        allocation = _allocation;
        totalScore = _totalScore;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function setAllocation(uint256 _alloc) external onlyOwner {
        allocation = _alloc;
    }

    function startClaiming() external onlyOwner {
        claimingActive = true;
    }

    function stopClaiming() external onlyOwner {
        claimingActive = false;
    }

    function startVesting() external onlyOwner {
        vestingActive = true;
    }

    function stopVesting() external onlyOwner {
        vestingActive = false;
    }

    function setTotalScore(uint256 _totScore) external onlyOwner {
        allocation = _totScore;
    }

    function setBaseURI(string memory _uri) external onlyOwner {
        baseURI = _uri;
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function setVestingAddress(EywaVesting _vestingContract) external onlyOwner {
        vestingContract = _vestingContract;
    }

    function setSaleOpen() external onlyOwner {
        saleActive = true;
    }

    function setSaleClosed() external onlyOwner {
        saleActive = false;
    }

    function getTokenStatus(uint256 tokenId) external view returns (uint8) {
        return tokenStatus[tokenId];
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        Address.sendValue(payable(owner()), balance);
    }

    function mint(bytes32[] calldata _merkleProof, uint256 score) external {
        require(saleActive, "Sale is closed");
        require(merkleRoot != 0, "Merkle root not set");
        require(balanceOf(msg.sender) < 1, "Can be minted only once");

        require(
            MerkleProof.verify(
                _merkleProof,
                merkleRoot,
                keccak256(abi.encodePacked(msg.sender, score)
                )
            ), "Invalid proof");


        uint256 _tokenId;

        if (TIER_ONE_MIN_SCORE <= score && score <= TIER_ONE_MAX_SCORE) {
            require(tierOneIndex + 1 <= TIER_ONE_SUPPLY, "Tier 1 supply ended");
            _tokenId = _pickRandomUniqueIdTierOne() + TIER_ONE_START;
        } else if (TIER_ONE_MAX_SCORE < score && score <= TIER_TWO_MAX_SCORE) {
            require(tierTwoIndex + 1 <= TIER_TWO_SUPPLY, "Tier 2 supply ended");
            _tokenId = _pickRandomUniqueIdTierTwo() + TIER_TWO_START;
        } else if (TIER_TWO_MAX_SCORE < score && score <= TIER_THREE_MAX_SCORE) {
            require(tierThreeIndex + 1 <= TIER_THREE_SUPPLY, "Tier 3 supply ended");
            _tokenId = _pickRandomUniqueIdTierThree() + TIER_THREE_START;
        } else if (TIER_THREE_MAX_SCORE < score && score <= TIER_FOUR_MAX_SCORE) {
            require(tierFourIndex + 1 <= TIER_FOUR_SUPPLY, "Tier 4 supply ended");
            _tokenId = _pickRandomUniqueIdTierFour() + TIER_FOUR_START;
        } else {
            revert("Score out of bounds");
        }

        claimableAmount[_tokenId] = allocation * score / totalScore;

        _safeMint(msg.sender, _tokenId);
        tokenStatus[_tokenId] = 1;
        emit Mint(msg.sender, _tokenId, score);
    }

    function mintUnclaimed(address _tokenOwner, uint256 score) onlyOwner external {
        require(saleActive, "Sale is closed");
        require(merkleRoot != 0, "Merkle root not set");
        require(balanceOf(msg.sender) < 1, "Can be minted only once");


        uint256 _tokenId;

        if (TIER_ONE_MIN_SCORE <= score && score <= TIER_ONE_MAX_SCORE) {
            require(tierOneIndex + 1 <= TIER_ONE_SUPPLY, "Tier 1 supply ended");
            _tokenId = _pickRandomUniqueIdTierOne() + TIER_ONE_START;
        } else if (TIER_ONE_MAX_SCORE < score && score <= TIER_TWO_MAX_SCORE) {
            require(tierTwoIndex + 1 <= TIER_TWO_SUPPLY, "Tier 2 supply ended");
            _tokenId = _pickRandomUniqueIdTierTwo() + TIER_TWO_START;
        } else if (TIER_TWO_MAX_SCORE < score && score <= TIER_THREE_MAX_SCORE) {
            require(tierThreeIndex + 1 <= TIER_THREE_SUPPLY, "Tier 3 supply ended");
            _tokenId = _pickRandomUniqueIdTierThree() + TIER_THREE_START;
        } else if (TIER_THREE_MAX_SCORE < score && score <= TIER_FOUR_MAX_SCORE) {
            require(tierFourIndex + 1 <= TIER_FOUR_SUPPLY, "Tier 4 supply ended");
            _tokenId = _pickRandomUniqueIdTierFour() + TIER_FOUR_START;
        } else {
            revert("Score out of bounds");
        }

        claimableAmount[_tokenId] = allocation * score / totalScore;

        _safeMint(TREASURY, _tokenId);
        tokenStatus[_tokenId] = 1;
        emit UnclaimedMint(_tokenOwner, _tokenId, score);
    }

    function claimCliff(uint256 tokenId) external {
        require(claimingActive, "Claiming period not started");
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Caller is not owner nor approved");
        require(claimableAmount[tokenId] != 0, "Must have claimable amount");
        require(tokenStatus[tokenId] == 1, "Token must have unclaimed cliff");

        uint256 claimedCliff = claimableAmount[tokenId] * CLIFF_PERCENT / 100;
        uint256 remainingAmount = claimableAmount[tokenId] - claimedCliff;
        vestingContract.claim(claimedCliff);
        vestingContract.eywaToken().safeTransfer(msg.sender, claimedCliff);
        burn(tokenId);

        uint256 newToken = tokenId + 100000;

        _safeMint(msg.sender, newToken);
        tokenStatus[newToken] = 2;
        claimableAmount[newToken] = remainingAmount;

        delete tokenStatus[tokenId];
        delete claimableAmount[tokenId];
    }

    function activateVesting(uint256 tokenId) external {
        require(vestingActive, "Vesting period not started");
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Caller is not owner nor approved");
        require(claimableAmount[tokenId] != 0, "Must have claimable amount");
        require(tokenStatus[tokenId] == 2, "Token must have unclaimed cliff");

        vestingContract.transfer(msg.sender, claimableAmount[tokenId]);
        burn(tokenId);

        uint256 newToken = tokenId + 100000;

        _safeMint(msg.sender, newToken);
        tokenStatus[newToken] = 3;

        delete tokenStatus[tokenId];
        delete claimableAmount[tokenId];
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override(ERC721Enumerable, ERC721) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function tokenOfOwnerByIndex(address owner, uint256 index) public view override(ERC721Enumerable) returns (uint256) {
        return super.tokenOfOwnerByIndex(owner, index);
    }

    function _pickRandomUniqueIdTierOne() private returns (uint256 id) {
        uint256 random = uint256(vrf());
        uint256 len = tierOneArray.length - tierOneIndex++;
        require(len > 0, 'no ids left');
        uint256 randomIndex = random % len;
        id = tierOneArray[randomIndex] != 0 ? tierOneArray[randomIndex] : randomIndex;
        tierOneArray[randomIndex] = uint16(tierOneArray[len - 1] == 0 ? len - 1 : tierOneArray[len - 1]);
        tierOneArray[len - 1] = 0;
    }

    function _pickRandomUniqueIdTierTwo() private returns (uint256 id) {
        uint256 random = uint256(vrf());
        uint256 len = tierTwoArray.length - tierTwoIndex++;
        require(len > 0, 'no ids left');
        uint256 randomIndex = random % len;
        id = tierTwoArray[randomIndex] != 0 ? tierTwoArray[randomIndex] : randomIndex;
        tierTwoArray[randomIndex] = uint16(tierTwoArray[len - 1] == 0 ? len - 1 : tierTwoArray[len - 1]);
        tierTwoArray[len - 1] = 0;
    }

    function _pickRandomUniqueIdTierThree() private returns (uint256 id) {
        uint256 random = uint256(vrf());
        uint256 len = tierThreeArray.length - tierThreeIndex++;
        require(len > 0, 'no ids left');
        uint256 randomIndex = random % len;
        id = tierThreeArray[randomIndex] != 0 ? tierThreeArray[randomIndex] : randomIndex;
        tierThreeArray[randomIndex] = uint16(tierThreeArray[len - 1] == 0 ? len - 1 : tierThreeArray[len - 1]);
        tierThreeArray[len - 1] = 0;
    }

    function _pickRandomUniqueIdTierFour() private returns (uint256 id) {
        uint256 random = uint256(vrf());
        uint256 len = tierFourArray.length - tierFourIndex++;
        require(len > 0, 'no ids left');
        uint256 randomIndex = random % len;
        id = tierFourArray[randomIndex] != 0 ? tierFourArray[randomIndex] : randomIndex;
        tierFourArray[randomIndex] = uint16(tierFourArray[len - 1] == 0 ? len - 1 : tierFourArray[len - 1]);
        tierFourArray[len - 1] = 0;
    }

    function vrf() public view returns (bytes32 result) {
        uint[1] memory bn;
        bn[0] = block.number;
        assembly {
            let memPtr := mload(0x40)
            if iszero(staticcall(not(0), 0xff, bn, 0x20, memPtr, 0x20)) {
                invalid()
            }
            result := mload(memPtr)
        }
    }

    function claimTeamNft(uint256 num) external onlyOwner {
        for (uint256 _tokenId = TEAM_START + teamIndex; _tokenId <= TEAM_START + teamIndex + num; _tokenId++) {
            claimableAmount[_tokenId] = 0;
            _safeMint(msg.sender, _tokenId);
            tokenStatus[_tokenId] = 3;
        }
        teamIndex += num;
    }
}