const { ethers } = require('hardhat');
const crypto = require('crypto');

describe('SYNTHESIS', () => {
    const TOKEN_NAME = "TestName"
    const TOKEN_SYMBOL = "TestSymbol"

    beforeEach(async () => {
        accounts = await ethers.getSigners()
    });

    describe('testing representation...', () => {

        it('Synthesis contract deployed', async function () {
            Synthesis = await ethers.getContractFactory('Synthesis')
            synthesis = await Synthesis.deploy(getRandomAddress(), getRandomAddress())
            ERC20 = await ethers.getContractFactory('SyntERC20')
            approvedToken = await ERC20.deploy(TOKEN_NAME, TOKEN_SYMBOL)
            expect(await synthesis.trustedForwarder).to.not.equal(0)
            expect(await approvedToken.name()).to.equal(TOKEN_NAME)
        });

        it('Compute the address and deploy a representation', async function () {
            const encodedParameters = web3.eth.abi.encodeParameters(
                ['string', 'string'],
                [TOKEN_NAME, TOKEN_SYMBOL]
            ).slice(2)
            const bytecodeWithParam = ERC20.bytecode + encodedParameters
            const salt = web3.utils.sha3(approvedToken.address)
            const expectedRepresentationAddress = web3.utils.toChecksumAddress(buildCreate2Address(
                synthesis.address,
                salt,
                bytecodeWithParam
            ))

            tx = await synthesis.createRepresentation(approvedToken.address, TOKEN_NAME, TOKEN_SYMBOL)
            receipt = await tx.wait()
            expect(expectedRepresentationAddress).to.equal(receipt.events[1].args._stoken)
        });

        it('Should revert with "token representation already exist"', async function () {
            await expect(synthesis.createRepresentation(approvedToken.address, TOKEN_NAME, TOKEN_SYMBOL))
                .to.be.revertedWith('Synt: token representation already exist')

        });

    })

    //utils - todo relocate
    function buildCreate2Address(creatorAddress, saltHex, byteCode) {
        return `0x${web3.utils.sha3(`0x${[
            'ff',
            creatorAddress,
            saltHex,
            web3.utils.sha3(byteCode)
        ].map(x => x.replace(/0x/, ''))
            .join('')}`).slice(-40)}`.toLowerCase()
    }

    function getRandomAddress() {
        return crypto.randomBytes(20).toString('hex')
    }

});
