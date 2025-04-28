import express from "express";
import env from "#configs/env";
import kite from "#configs/kite";
import { getLastTradingDayOHLC } from "#services/dailyLevel";

const router = express.Router();

const levels = {
  bc: 78249.22,
  tc: 77641.27,
  r1: 78976.23,
  r2: 79224.72,
  r3: 79896.25,
  r4: 81175.72,
  s1: 77273.72,
  s2: 75994.25,
  s3: 75322.72,
  s4: 74043.25,
};

router.get("/login", (req, res) => {
  const loginUrl = kite.getLoginURL();
  res.redirect(loginUrl);
});

router.get("/credentials", async (req, res) => {
  const { request_token } = req.query;

  // Validate query parameters
  if (!request_token) {
    console.log("Invalid or missing request token.");
    return res
      .status(401)
      .json(
        { error: "Invalid or missing request token. Please login again" },
        { status: 401 },
      );
  }

  // Step 1: Generate session
  const session = await kite.generateSession(request_token, env.SECRET);

  if (!session || !session.access_token) {
    console.error("Failed to generate session or missing access token.");
    return res
      .status(500)
      .json({ error: "Failed to generate session." }, { status: 500 });
  }

  // Step 2: Set access token
  const accessToken = session.access_token;
  kite.setAccessToken(accessToken);
  console.log(accessToken);

  // Step 3: Fetch user profile
  const profile = await kite.getProfile();
  if (!profile) {
    console.error("Failed to fetch user profile.");
    return NextResponse.json(
      { error: "Failed to fetch user profile." },
      { status: 500 },
    );
  }

  const balance = await kite.getMargins("equity");
  const lastOhlc = await getLastTradingDayOHLC(265);
});

export default router;
