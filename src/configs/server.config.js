import express from "express";
import env from "./env.config.js";
import router from "#routes/index";
import { isWorkingDay } from "#utils/dayChecker";
import connectDB from "#configs/database";

export const obj = {
  requesttoken: null,
  key: env.KEY,
  secret: env.KITE_SECRET,
  accesstoken: "cxobkqajgwe1efisb1dmp0mlxtoodg8k",
};

await connectDB(env.DB_URI);

export const server = express();

server.use(express.json());

server.use("/", router);

server.use((err, req, res, next) => {
  console.log(err);
  res.send("Error");
});

server.get("/login", (req, res) => {
  const day = isWorkingDay();
  if (!day) {
    return res
      .status(400)
      .json({ status: false, message: "Today is not a working day" });
  }
  res.redirect(`https://kite.zerodha.com/connect/login?v=3&api_key=${env.KEY}`);
});
