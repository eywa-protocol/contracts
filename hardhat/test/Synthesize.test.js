const { ethers } = require('hardhat');
const crypto = require('crypto');

//utils
function buildCreate2Address(creatorAddress, saltHex, byteCode) {
    return `0x${web3.utils.sha3(`0x${[
        'ff',
        creatorAddress,
        saltHex,
        web3.utils.sha3(byteCode)
    ].map(x => x.replace(/0x/, ''))
     .join('')}`).slice(-40)}`.toLowerCase()
}
//utils
function getRandomAddress() {
    return crypto.randomBytes(20).toString('hex')
}


describe('SYNTHESIS', () => {
    const TEST_TOKEN_NAME = "TestName"
    const TEST_TOKEN_SYMBOL = "TestSymbol"

    beforeEach(async () => {
        accounts = await ethers.getSigners();
    });

    describe('testing representation...', () => {

        it('Synthesis contract deployed', async function () {
            Synthesis = await ethers.getContractFactory('Synthesis');
            synthesis = await Synthesis.deploy(getRandomAddress(), getRandomAddress());
            ERC20 = await ethers.getContractFactory('SyntERC20');
            originalToken = await ERC20.deploy(TEST_TOKEN_NAME, TEST_TOKEN_SYMBOL);
            expect(await originalToken.name()).to.equal(TEST_TOKEN_NAME)
        });

        it('Compute the address and deploy a representation', async function () {
            const encodedParameters = web3.eth.abi.encodeParameters(
                ['string', 'string'],
                [TEST_TOKEN_NAME, TEST_TOKEN_SYMBOL]
            ).slice(2)
            const bytecodeWithParam = ERC20.bytecode + encodedParameters;
            const salt = web3.utils.sha3(web3.utils.toHex(originalToken.address), { encoding: "hex" });
            const expectedRepresentationAddress = web3.utils.toChecksumAddress(buildCreate2Address(
                synthesis.address,
                salt,
                bytecodeWithParam
            ))

            tx = await synthesis.createRepresentation(originalToken.address, TEST_TOKEN_NAME, TEST_TOKEN_SYMBOL)
            receipt = await tx.wait()
            expect(expectedRepresentationAddress).to.equal(receipt.events[1].args._stoken)
        });

        it('Should revert with "token representation already exist"', async function () {
            await expect(synthesis.createRepresentation(originalToken.address, TEST_TOKEN_NAME, TEST_TOKEN_SYMBOL))
            .to.be.revertedWith('Synt: token representation already exist')

        });

    })

});
