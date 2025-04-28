import BaseSchema from "#models/base";
import mongoose from "mongoose";

const dailyLevelSchema = new BaseSchema({
  date: {
    type: Date,
    required: true,
  },
  dataDate: {
    type: Date,
    required: true,
  },
  bc: {
    type: Number,
    required: true,
  },
  tc: {
    type: Number,
    required: true,
  },
  r1: {
    type: Number,
    required: true,
  },
  r2: {
    type: Number,
    required: true,
  },
  r3: {
    type: Number,
    required: true,
  },
  r4: {
    type: Number,
    required: true,
  },
  s1: {
    type: Number,
    required: true,
  },
  s2: {
    type: Number,
    required: true,
  },
  s3: {
    type: Number,
    required: true,
  },
  s4: {
    type: Number,
    required: true,
  },
  buffer: {
    type: Number,
    required: true,
  },
});

export default mongoose.model("dailyLevel", dailyLevelSchema);
