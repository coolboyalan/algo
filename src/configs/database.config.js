import mongoose from "mongoose";

async function connectDB(DB_URI) {
  try {
    await mongoose.connect(DB_URI);
    console.log("Connected to database successfully");
  } catch (err) {
    console.log(err);
  }
}

export default connectDB;
