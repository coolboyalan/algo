import mongoose from "mongoose";
import BaseSchema from "#models/base";

const candleSchema = new BaseSchema({
  open: {
    type: Number,
    required: true,
  },
  high: {
    type: Number,
    required: true,
  },
  low: {
    type: Number,
    required: true,
  },
  close: {
    type: Number,
    required: true,
  },
  period: {
    type: String,
    enum: ["minute", "day", "hour"],
  },
  time: {
    type: Number,
  },
});

export default mongoose.model("candle", candleSchema);
