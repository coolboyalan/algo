import BaseSchema from "#models/base";
import mongoose from "mongoose";

const tokenSchema = new BaseSchema({
  broker: {
    type: String,
  },
  token: {
    type: String,
  },
  date: {
    type: String,
  },
});

export default mongoose.model("token", tokenSchema);
