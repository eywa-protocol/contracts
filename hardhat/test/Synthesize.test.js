const TOKEN_NAME = "TestName"
const TOKEN_SYMBOL = "TestSymbol"
const abiCoder = new ethers.utils.AbiCoder

describe('Synthesis contract', () => {

    before(async () => {
        [owner, user, bridge, forwarder] = await ethers.getSigners()

        Synthesis = await ethers.getContractFactory('Synthesis')
        Portal = await ethers.getContractFactory('Portal')
        ERC20 = await ethers.getContractFactory('SyntERC20')

        synthesis = await Synthesis.deploy(bridge.address, forwarder.address)
        portal = await Portal.deploy(bridge.address, forwarder.address)
        realToken = await ERC20.deploy(TOKEN_NAME, TOKEN_SYMBOL)

    });

    describe('testing token representation...', () => {

        it('Portal: Create representation request from user', async function () {
            await expect(portal.connect(user).createRepresentationRequest(realToken.address))
                .to.emit(portal, 'RepresentationRequest')
                .withArgs(realToken.address)
        });

        it('Portal: Approve representation request from owner', async function () {
            await expect(portal.connect(owner).approveRepresentationRequest(realToken.address))
                .to.emit(portal, 'ApprovedRepresentationRequest')
                .withArgs(realToken.address)
        });


        it('Synthesis: Should create a representation and mint some tokens', async function () {
            // determine the address
            const bytecodeWithParams = ERC20.bytecode + web3.eth.abi.encodeParameters(
                ['string', 'string'],
                [TOKEN_NAME, TOKEN_SYMBOL]
            ).slice(2)
            const salt = web3.utils.sha3(realToken.address)
            const expectedRepresentationAddress = web3.utils.toChecksumAddress(getCreate2Address(
                synthesis.address,
                salt,
                bytecodeWithParams
            ))

            const txId = web3.utils.randomHex(32)
            const value = ethers.utils.parseEther("1.0")
            const tokenData = abiCoder.encode(["string", "string"], [TOKEN_NAME, TOKEN_SYMBOL]);

            // direct call (test only)
            await expect(synthesis.connect(bridge).mintSyntheticToken(
                txId,
                realToken.address,
                value,
                user.address,
                tokenData
            )).to.emit(synthesis, 'CreatedRepresentation')
                .withArgs(realToken.address, expectedRepresentationAddress)

            const syntheticToken = ERC20.attach(expectedRepresentationAddress)
            const userBalance = await syntheticToken.connect(user).balanceOf(user.address)
            await expect(userBalance).to.equal(value)
            await expect(await syntheticToken.name()).to.equal(TOKEN_NAME)
            await expect(await syntheticToken.symbol()).to.equal(TOKEN_SYMBOL)
        });

    })

    //utils - TODO relocate
    function getCreate2Address(creatorAddress, saltHex, byteCode) {
        return `0x${web3.utils.sha3(`0x${[
            'ff',
            creatorAddress,
            saltHex,
            web3.utils.sha3(byteCode)
        ].map(x => x.replace(/0x/, ''))
            .join('')}`).slice(-40)}`.toLowerCase()
    }

});
