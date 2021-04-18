const { expectRevert } = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const ImplV1 = artifacts.require('DummyImplementation');
const ImplV2 = artifacts.require('DummyImplementationV2');
const ProxyAdmin = artifacts.require('MockProxyAdmin');
const TransparentUpgradeableProxy = artifacts.require('MockTransparentUpgradeableProxy');

contract('Proxy', function (accounts) {
  const [proxyAdminOwner, newAdmin, anotherAccount] = accounts;

  before('set implementations', async function () {
    this.implementationV1 = await ImplV1.new();
    this.implementationV2 = await ImplV2.new();
  });

  beforeEach(async function () {
    const initializeData = Buffer.from('');
    this.proxyAdmin      = await ProxyAdmin.new({ from: proxyAdminOwner });
    this.proxy           = await TransparentUpgradeableProxy.new(
      this.implementationV1.address,
      this.proxyAdmin.address,
      initializeData,
      { from: proxyAdminOwner }
    );
  });



 describe('Proxy', function () {

	context('', async function () { 	

			it('returns proxyAdmin as admin of the proxy', async function () {
			  const admin = await this.proxyAdmin.getProxyAdmin(this.proxy.address);
			  expect(admin).to.be.equal(this.proxyAdmin.address);
			});

			it('call to invalid proxy', async function () {
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
			});
	});

});  

})