"use strict";
// const Web3 = require('web3');
// const web3 = new Web3();

async function signPermit1(_owner, _spender, _value, _contract){
  const fromAddress = _owner;
  const spender = _spender;
  const value = _value
  const expiry = Date.now() + 120;
  const nonce = 1;
  const chainId = await web3.eth.getChainId()


  const createPermitMessageData = function () {
    const message = {
      owner: fromAddress,
      spender: spender,
      value: value,
      nonce: nonce,
      deadline: 1929542336185
    };
  
    const typedData = JSON.stringify({
      types: {
        EIP712Domain: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "version",
            type: "string",
          },
          {
            name: "chainId",
            type: "uint256",
          },
          {
            name: "verifyingContract",
            type: "address",
          },
        ],
        Permit: [
          {
            name: "owner",
            type: "address",
          },
          {
            name: "spender",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
          },
        ],
      },
      primaryType: "Permit",
      domain: {
        name: "EYWA",
        version: "1",
        chainId: chainId,
        verifyingContract: _contract,
      },
      message: message,
    });

    return {
      typedData,
      message,
    };
  };
  
  const signData = async function (web3, fromAddress, typeData) {
    return new Promise(function (resolve, reject) {
      web3.currentProvider.send(
        {
          id: 1,
          method: "eth_signTypedData_v4",
          params: [fromAddress, typeData],
          from: fromAddress,
        },
        function (err, result) {
          if (err) {
            reject(err); //TODO
          } else {
            const r = result.result.slice(0, 66);
            const s = "0x" + result.result.slice(66, 130);
            const v = Number("0x" + result.result.slice(130, 132));
            resolve({
              v,
              r,
              s,
            });
          }
        }
      );
    });
  };

 const signTransferPermit = async function () {
    const messageData = createPermitMessageData();
    const sig = await signData(web3, fromAddress, messageData.typedData);
    return Object.assign({}, sig, messageData.message);
  };

  return signTransferPermit()
}


////////////////////////////////////////////////////////////////////////////////////////////////////////

async function signPermit(sender, spender, val, token, nonce) {

  const EIP712Domain = [
     { name: 'name', type: 'string' },
     { name: 'version', type: 'string' },
     { name: 'chainId', type: 'uint256' },
     { name: 'verifyingContract', type: 'address' },
   ]
   const domain = {
     name: 'EYWA',
     version: '1',
     chainId: await web3.eth.getChainId(),
     verifyingContract: token.address,
   }
   const Permit = [
     { name: 'owner', type: 'address' },
     { name: 'spender', type: 'address' },
     { name: 'value', type: 'uint256' },
     { name: 'nonce', type: 'uint256' },
     { name: 'deadline', type: 'uint256' },
   ]
   //TODO: calculate value
   const message = {
     owner: sender,
     spender: spender,
     value: val,
     nonce: nonce,
     deadline: 1929542336185,
   }
   const data = JSON.stringify({
     types: {
       EIP712Domain,
       Permit,
     },
     domain,
     primaryType: 'Permit',
     message,
   })

   const web3Provider = new ethers.providers.Web3Provider(web3.currentProvider);
   const tx = await web3Provider.send('eth_signTypedData_v4', [message.owner, data]); console.log(tx)
   const sig = await ethers.utils.splitSignature(tx); console.log(sig)

      
// const signData = async function (message, data) {
//   return new Promise(function (resolve, reject) {
//   web3.currentProvider.send(
//     {
//       id: 1,
//       method: "eth_signTypedData_v4",
//       params: [message.owner, data],
//       from: message.owner,
//     },
//     function (err, result) {
//       if (err) {
//         reject(err); //TODO
//       } else {
//         const r = result.result.slice(0, 66);
//         const s = "0x" + result.result.slice(66, 130);
//         const v = Number("0x" + result.result.slice(130, 132));
//         resolve({
//           v,
//           r,
//           s,
//         });
//       }
//     }
//   );
//   });
// }

// const sig = await signData( message, data);

   const approvalArgs = {
     owner: message.owner,
     spender: message.spender,
     value: message.value,
     deadline: message.deadline, 
     v: sig.v,
     r: sig.r,
     s: sig.s
   }

// console.log(domain.verifyingContract)

   return approvalArgs
  //  const approvalData = new ethers.utils.Interface(token.abi).encodeFunctionData("permit", approvalArgs)
  //  return approvalData
}

module.exports = {
  signPermit,
  signPermit1
};
