import {
  AccountUpdate,
  Field, 
  Mina, 
  PrivateKey,
  MerkleTree,
  UInt32,
} from 'o1js';

import { MsgProcessor, Msg } from './MsgProcessor.js'

const doProofs = true;

let Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
Mina.setActiveInstance(Local);
let initialBalance = 10_000_000_000;

let feePayerKey = Local.testAccounts[0].privateKey;
let feePayer = Local.testAccounts[0].publicKey;

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

console.log("fund new account...");

let msgProcessorZkApp = new MsgProcessor(zkappAddress);
console.log('Deploying MsgProcessor..');
if (doProofs) {
await MsgProcessor.compile();
}
let tx = await Mina.transaction(feePayer, () => {
AccountUpdate.fundNewAccount(feePayer).send({
  to: zkappAddress,
  amount: initialBalance,
});
msgProcessorZkApp.deploy();
});
await tx.prove();
await tx.sign([feePayerKey, zkappKey]).send();


describe('MsgProcessor.js', () => {
  describe('MsgProcessor()', () => {
    it('basic case. should be correct.', async () => {
      await processMsg(0, 123, 1234, 15001, 16236);
      msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(0));
      await processMsg(1, 123, 1234, 15001, 16236);
      msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(1));
      await processMsg(2, 123, 1234, 15001, 16236);
      msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(2));

    });
    
    it('wrong checksum', async () => {
      console.log("wrong checksum");
      await processMsg(3, 123, 1234, 15001, 16235);
      // the wrong checksum msg is ignored.
      msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(2));
    });

    // msgNum does not have valid range specified.  
    // it('out of range msgNum', async () => {
    //   console.log("out of range msgNum");
    //   // CheckSum is the sum of Agent ID , Agent XLocation , and Agent YLocation
    //   await processMsg(-1, 123, 1234, 15001, 16236);
    //   // the wrong msg is ignored
    //   msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(2));

    //   await processMsg(3001, 123, 1234, 15001, 16236);
    //   // the wrong msg is ignored
    //   msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(2));      
    // });

    it('out of range agent id', async () => {
      console.log("out of range agent id");
      // Agent ID (should be between 0 and 3000)

      await processMsg(6, 3001, 1234, 15001, 19236);
      // the wrong msg is ignored
      msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(2));      
    });

    it('out of range xlocation', async () => {
      console.log("out of range xlocation");
      // agent XLocation (should be between 0 and 15000)

      await processMsg(7, 3000, 15001, 15002, 33003);
      // the wrong msg is ignored
      msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(2));      
    });

    it('out of range ylocation - smaller', async () => {
      console.log("out of range ylocation - smaller");
      // Agent YLocation (should be between 5000 and 20000)

      await processMsg(8, 3000, 1000, 4999, 8999);
      // the wrong msg is ignored
      msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(2));      
    });

    it('out of range ylocation - bigger', async () => {
      console.log("out of range ylocation - bigger");
      // Agent YLocation (should be between 5000 and 20000)

      await processMsg(9, 3000, 1000, 20001, 24001);
      // the wrong msg is ignored
      msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(2));      
    });

    it('xlocation > ylocation', async () => {
      console.log("xlocation > ylocation");
      // Agent YLocation (should be between 5000 and 20000)

      await processMsg(10, 3000, 7000, 6000, 16000);
      // the wrong msg is ignored
      msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(2));      
    });
    
    it('smaller  msgNum', async () => {
      console.log("smaller  msgNum");

      await processMsg(1, 3000, 1000, 6000, 10000);
      // the smaller msgNum than current highest won't change the current highest
      msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(2));      
    });

    it('agentid 0', async () => {
      console.log("agentid 0");

      await processMsg(11, 0, 1000, 6000, 10000);
      // If Agent ID is zero we don't need to check the other values, but this is still a valid message
      msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(11));      
    });
    
    console.log("agentid 0");
    // await processMsg(3, 1234, 1234, 15001, 16236);
    // msgProcessorZkApp.highestProcessed.requireEquals(new UInt32(2));
    
  });
});


async function processMsg(msgNum: number, agentId: number, xlocation: number, ylocation: number, checksum: number) {
  let msg = new Msg({
    msgNum: new UInt32(msgNum),
    agentId: new UInt32(agentId),
    xlocation: new UInt32(xlocation),
    ylocation: new UInt32(ylocation),
    checksum: new UInt32(checksum),
  });

  let tx = await Mina.transaction(feePayer, () => {
      msgProcessorZkApp.processMsg(msg);
  });
  await tx.prove();
  await tx.sign([feePayerKey, zkappKey]).send();

  // if the transaction was successful, we can update our off-chain storage as well

}