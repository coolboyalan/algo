import BaseSchema from "#models/base";
import mongoose from "mongoose";

const tradeSchema = new BaseSchema({
  direction: {
    type: String,
    enum: ["PE", "CE"],
  },
  asset: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    reqyired: true,
  },
  time: {
    type: Date,
  },
});

export default mongoose.model("trade", tradeSchema);
