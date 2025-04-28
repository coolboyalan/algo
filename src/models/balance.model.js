import mongoose from "mongoose";
import BaseSchema from "#models/base";

const balanceSchema = new BaseSchema({
  startingBalance: {
    type: Number,
    required: true,
  },
  lossHit: {
    type: Boolean,
    required: true,
    default: false,
  },
  profitHit: {
    type: Boolean,
    required: true,
    default: false,
  },
});

balanceSchema.methods.getMaxLoss = function () {
  return this.startingBalance / 10;
};
