const { migrateLocalnetwork} = require('./migrate');

module.exports = async (deployer, network, accounts) => {
	if (network === 'network1' || network === 'network2' || network === 'network3') {
      await migrateLocalnetwork(deployer, network, accounts);
  	}
}
