import express from "express";
import env from "#configs/env";
import kite from "#configs/kite";
import { getLastTradingDayOHLC } from "#services/dailyLevel";
import { login } from "#controllers/kite";

const router = express.Router();

router.get("/login", (req, res) => {
  const loginUrl = kite.getLoginURL();
  res.redirect(loginUrl);
});

router.get("/credentials", login);

export default router;
