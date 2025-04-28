import express from "express";
import env from "./env.config.js";
import router from "#routes/index";

export const obj = {
  requesttoken: null,
  key: env.KEY,
  secret: env.SECRET,
  accesstoken: "cxobkqajgwe1efisb1dmp0mlxtoodg8k",
};

export const server = express();

server.use(express.json());

server.use("/", router);

server.use((err, req, res, next) => {
  console.log(err);
  res.send("Error");
});

server.get("/login", (req, res) => {
  res.redirect(`https://kite.zerodha.com/connect/login?v=3&api_key=${env.KEY}`);
});
