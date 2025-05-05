import mongoose from "mongoose";
import BaseSchema from "#models/base";

const dailyLevelSchema = new BaseSchema({
  token: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  forDay: {
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

dailyLevelSchema.index({ token: 1, date: 1, forDay: 1 }, { unique: true });

export default mongoose.model("dailyLevel", dailyLevelSchema);
