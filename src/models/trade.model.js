import BaseSchema from "#models/base";

const tradeSchema = new BaseSchema({
  direction:{
    type:String,
    enum:["Long","Short"]
  },
  asset:{
    type:String,
    required:true
  },
  baseAsseet:{
    type:String
  },
  entryPrice:{
    type:Number,
    required:true
  }
})
