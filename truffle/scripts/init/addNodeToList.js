const argv = require('minimist')(process.argv.slice(2), {string: ['wallet_node', 'pubkey_node', 'p2p_address', 'enable' ]});
const NodeList    = artifacts.require('NodeList');
let env           = require('dotenv').config({ path: `../../env_connect_to_${process.argv[5]}.env` });

module.exports = async callback => {
try{
console.log(`env.parsed.NODELIST_${process.argv[5].toUpperCase()}`);
	this.walletNode       = argv.wallet_node.trim();
	this.p2pAddressNode_1 = await web3.utils.fromAscii(argv.p2p_address.trim());
    this.pubKeyNode_1     = argv.pubkey_node.trim();
    this.enableNode_1     = argv.enable.trim();
    
      const nodeList      = await NodeList.at(eval(`env.parsed.NODELIST_${process.argv[5].toUpperCase()}`));
      const tx            = await nodeList.addNode(this.walletNode, this.p2pAddressNode_1, this.pubKeyNode_1, this.enableNode_1, { from: (await web3.eth.getAccounts())[0] });

      console.log(`> TX SUCCESSFUL: ${tx.tx}\n`);
      //check result by key
      console.log(await nodeList.getNode(this.walletNode));

  
}catch(e){console.log(e);}
  callback();
}

//npx truffle exec './scripts/init/0_setSecondPool.js' --newtwork newtwork1--wallet_node "0x6786D7A5d7f1898220503aa35527250B275dBBE9" --pubkey_node "0x194e868506502e5ecae3e5b623801548125a748e6b2da15681312a7cf0283acc" --p2p_address "/ip4/127.0.0.1/tcp/6666/p2p/QmbDd2omyRkTipjw6jTjrHYKp2pPhKp15SNZ2azqvvp1i7" --enable "true"