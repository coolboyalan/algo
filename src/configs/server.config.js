import { SmartAPI } from "smartapi-javascript";
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

export const smartAPI = new SmartAPI({
  api_key: process.env.ANGEL_KEY,
  // ANGEL_SECRET is not required by SDK here unless using JWT-based flows
});
await smartAPI.setAccessToken(env.ANGEL_ACCESS_TOKEN);

server.get("/angelone-login", async (req, res) => {
  const client_code = env.ANGEL_CLIENT;
  const password = env.ANGEL_PASS;
  const { totp } = req.query;

  if (!client_code || !password || !totp) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: client_code, password, or totp",
    });
  }

  try {
    const response = await smartAPI.generateSession(
      client_code,
      password,
      totp,
    );
    const { access_token, refresh_token, feed_token } = response.data;

    res.json({
      success: true,
      access_token,
      refresh_token,
      feed_token,
      profile: response.data,
    });

    await smartAPI.setAccessToken(access_token); // You already have this from login
  } catch (error) {
    console.error("Angel One login error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Login failed",
    });
  }
});
