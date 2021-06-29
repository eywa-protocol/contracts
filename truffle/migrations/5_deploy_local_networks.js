const { migrateLocalnetwork} = require('./migrate');

module.exports = async (deployer, network, accounts) => {
      await migrateLocalnetwork(deployer, network, accounts);
}
