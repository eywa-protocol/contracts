const argv = require('minimist')(process.argv.slice(2), {string: ['networks', 'parentpid' ]});
const fs = require("fs");
let networkConfig = require('../helper-hardhat-config.json');
console.log('123network_config', this.networksFromConfig);
    this.networksFromConfig  = argv.networks?.split(',') || Object.keys(networkConfig);
console.log('222network_config', this.networksFromConfig);
    for(let net of this.networksFromConfig){ if( !Object.keys(networkConfig).includes(net) && net !== ''){ console.log(`Unresolved network: ${net}`); process.kill(argv.parentpid, 'SIGTERM'); process.exit(1); }}
    console.log("Networks in process: ", this.networksFromConfig[0] === '' ?  Object.keys(networkConfig) : this.networksFromConfig);
     for(let net of this.networksFromConfig){
      if(net !== ''){
        networkConfig[net].nodeList = '';
        networkConfig[net].mockDexPool = '';
        networkConfig[net].bridge = '';
        networkConfig[net].portal = '';
        networkConfig[net].synthesis = '';
        fs.writeFileSync("../helper-hardhat-config.json", JSON.stringify(networkConfig, undefined, 2));
      }
     }
     process.exit(0);
