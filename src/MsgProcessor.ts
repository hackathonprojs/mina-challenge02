

import { Bool, Field, MerkleTree, Poseidon, Provable, SmartContract, State, Struct, UInt32, method, state, } from "o1js";

/*
Each message has
- Message number
- Message details
  - Agent ID (should be between 0 and 3000)
  - Agent XLocation (should be between 0 and 15000)
  - Agent YLocation (should be between 5000 and 20000)
  - CheckSum

a field is 255bits.  
we will divide the field as:
first 32 bits: message number
next 16 bits: agent id
next 16 bits: agent xlocation
next 16 bits: agent ylocation
next 32 bits: checksum



 */
export class Msg extends Struct({
  msgNum: UInt32,
  agentId: UInt32,
  xlocation: UInt32,
  ylocation: UInt32,
  checksum: UInt32,
}) {
  hash(): Field {
    return Poseidon.hash(Msg.toFields(this));
  }
  
}

export class MsgProcessor extends SmartContract {

  /** record the highest msg number processed */
  @state(UInt32) highestProcessed = State<UInt32>();

  @method init() {
    super.init();
    
  }

  /**
   * process the messages passed in.  
   * @param msgs 
   */
  @method processMsg(msg:Msg) {
    // process msg
    let valid = this.checkMsg(msg);
    //let highestProcessed = await this.highestProcessed.fetch(); // Error: fetch is not intended to be called inside a transaction block.
    let highestProcessed = this.highestProcessed.get();
    this.highestProcessed.requireEquals(highestProcessed);
    this.highestProcessed.set(Provable.if(valid, msg.msgNum, highestProcessed));
    //console.log(msg);
  }

  /**
   * process the messages passed in.  
   * @param msgs 
   */
  // @method processMsgs(msgs:MerkleTree) {
  //   let leafCount = msgs.leafCount;
  //   let height = msgs.height;
  //   for (let i:bigint = BigInt(0); i<leafCount; i++) {
  //     msgs.getNode(height, i);
  //   }
    
  //   // msgs.forEach(async (msg) => {
  //   //   // process msg
  //   //   let valid = this.checkMsg(msg);
  //   //   let highestProcessed = await this.highestProcessed.fetch();
  //   //   this.highestProcessed.set(Provable.if(valid, msg.msgNum, highestProcessed!));
  //   //   console.log(msg);
  //   // })
  // }

  /**
   * check if message has valid value.  
   * 
   * You need to check that
    - CheckSum is the sum of Agent ID , Agent XLocation , and Agent YLocation
    - the 4 message details numbers are in the correct range
    - Agent YLocation should be greater than Agent XLocation

    If Agent ID is zero we don't need to check the other
    values, but this is still a valid message
   * @returns 
   */
  @method checkMsg(msg:Msg):Bool {
    let sum:UInt32 = msg.agentId.add(msg.xlocation).add(msg.ylocation);
    let condition0:Bool = msg.agentId.equals(new UInt32(0));
    
    let condition1:Bool = msg.checksum.equals(sum);

    // - Agent ID (should be between 0 and 3000)
    // - Agent XLocation (should be between 0 and 15000)
    // - Agent YLocation (should be between 5000 and 20000)
    let condition2_1:Bool = msg.agentId.greaterThanOrEqual(new UInt32(0)).and(msg.agentId.lessThanOrEqual(new UInt32(3000)));
    let condition2_2:Bool = msg.xlocation.greaterThanOrEqual(new UInt32(0)).and(msg.xlocation.lessThanOrEqual(new UInt32(15000)));
    let condition2_3:Bool = msg.ylocation.greaterThanOrEqual(new UInt32(5000)).and(msg.ylocation.lessThanOrEqual(new UInt32(20000)));
    let condition2:Bool = condition2_1.and(condition2_2).and(condition2_3);
                          
    let condition3:Bool = msg.ylocation.greaterThan(msg.xlocation);
    return condition0.or(condition1.and(condition2).and(condition3));
  }
}