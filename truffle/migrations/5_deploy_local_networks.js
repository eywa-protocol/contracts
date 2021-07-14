const { migrateLocalnetwork, migratGSN} = require('./migrate');

module.exports = async (deployer, network, accounts) => {
      if (network == "network2") {
      await migratGSN(deployer, network, accounts)
      }
      await migrateLocalnetwork(deployer, network, accounts);

}
