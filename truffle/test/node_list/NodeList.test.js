const { expectRevert } = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const NodeList = artifacts.require('NodeList');

contract('NodeList', function (accounts) {
  const [owner, adrWalletNode1, adrWalletNode2] = accounts;

  before('init new contract', async function () {
    this.nodeList         = await NodeList.new();
    this.p2pAddressNode_1 = await web3.utils.fromAscii('/ip4/127.0.0.1/tcp/6666/p2p/QmbDd2omyRkTipjw6jTjrHYKp2pPhKp15SNZ2azqvvp1i7');
    this.p2pAddressNode_2 = await web3.utils.fromAscii('/ip4/127.0.0.1/tcp/7777/p2p/DsqDd2omyRkTipjw6jTjrHYKp2pPhKp15SNZ2azqvvp1i8');
    this.pubKeyNode_1     = '0x194e868506502e5ecae3e5b623801548125a748e6b2da15681312a7cf0283acc';
    this.pubKeyNode_2     = '0x0da632a0af66bc9748f4fe4e8261facffbaef084ae1c591b1d30889622975735';
    this.enableNode_1     = true;
    this.enableNode_2     = true;
    
  });

  // beforeEach(async function () {
  //   const initializeData = Buffer.from('');
  //   this.proxyAdmin      = await ProxyAdmin.new({ from: proxyAdminOwner });
  //   this.proxy           = await TransparentUpgradeableProxy.new(
  //     this.implementationV1.address,
  //     this.proxyAdmin.address,
  //     initializeData,
  //     { from: proxyAdminOwner }
  //   );
  // });



 describe('NodeList', function () {

			it('check all', async function () {
			  const tx1 = await this.nodeList.addNode(adrWalletNode1, this.p2pAddressNode_1, this.pubKeyNode_1, this.enableNode_1);
			  const tx2 = await this.nodeList.addNode(adrWalletNode2, this.p2pAddressNode_2, this.pubKeyNode_2, this.enableNode_2);
			  
			  const gt1 = await this.nodeList.getAllNodeWallet();
			  	expect(gt1[0]).to.be.equal(adrWalletNode1);
			  	expect(gt1[1]).to.be.equal(adrWalletNode2);
			  const gt2 = await this.nodeList.getNode(adrWalletNode1);
			  	expect(gt2.nodeWallet).to.be.equal(adrWalletNode1);
			  	expect(await web3.utils.toAscii(gt2.p2pAddress)).to.be.equal(await web3.utils.toAscii(this.p2pAddressNode_1));
			  	expect(gt2.pubKey).to.be.equal(this.pubKeyNode_1);
			  	expect(gt2.enable).to.be.equal(this.enableNode_1);
			  const gt3 = await this.nodeList.getNode(adrWalletNode2);
			  	expect(gt3.nodeWallet).to.be.equal(adrWalletNode2);
			  	expect(await web3.utils.toAscii(gt3.p2pAddress)).to.be.equal(await web3.utils.toAscii(this.p2pAddressNode_2));
			  	expect(gt3.pubKey).to.be.equal(this.pubKeyNode_2);
			  	expect(gt3.enable).to.be.equal(this.enableNode_2);
			  
			});

 // enable: true,
 //  nodeWallet: '0x23a0d8DbDA10A9d4a9a08Ab26f52bC4EaeE41f89',
 //  p2pAddress: '0x2f6970342f3132372e302e302e312f7463702f363636362f7032702f516d624464326f6d79526b5469706a77366a546a7248594b70327050684b703135534e5a32617a71767670316937',
 //  pubKey: '0x194e868506502e5ecae3e5b623801548125a748e6b2da15681312a7cf0283acc'


			/*it('call to invalid proxy', async function () {
				await expectRevert.unspecified(this.proxyAdmin.getProxyAdmin(this.implementationV1.address));
			});

			it('fails to upgrade', async function () {
				await expectRevert(
					this.proxyAdmin.upgrade(this.proxy.address, this.implementationV2.address, { from: anotherAccount }),
					'caller is not the owner'
				);
			});

					it('EMULATE SOME BUISSNES LOGIC', async function () {
						this.implementationV1 = await ImplV1.at(this.proxy.address);
						await this.implementationV1.initializeNonPayableWithValue(1);
						console.log((await this.implementationV1.value.call()).toString());
						

					});

			it('upgrades implementation && check values', async function () {

				await this.proxyAdmin.upgrade(this.proxy.address, this.implementationV2.address, { from: proxyAdminOwner });
				const implementationAddress = await this.proxyAdmin.getProxyImplementation(this.proxy.address);
				expect(implementationAddress).to.be.equal(this.implementationV2.address);

				this.implementationV1 = await ImplV1.at(this.proxy.address);
				expect((await this.implementationV1.value.call()).toString()).to.be.equal('0');
				this.implementationV2 = await ImplV2.at(this.proxy.address);
				expect((await this.implementationV2.value.call()).toString()).to.be.equal('0');

				await this.implementationV2.initializeNonPayableWithValue(2);
				expect((await this.implementationV2.value.call()).toString()).to.be.equal('2');
				await this.implementationV2.setValue2(3);
				expect((await this.implementationV2.value2.call()).toString()).to.be.equal('3');

				expect(await this.implementationV2.version()).to.be.equal('V2');
			});*/

});  

})