import env from "#configs/env";
import kite from "#configs/kite";
import {
  isMondayOrFridayInIST,
  getISTMidnightFakeUTCString,
} from "#utils/dayChecker";
import { getLastTradingDayOHLC } from "#services/dailyLevel";
import DailyLevel from "#models/dailyLevel";
import DailyLevelService from "#services/dailyLevel";
import TokenService from "#services/token";

export async function login(req, res, next) {
  try {
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
    const session = await kite.generateSession(request_token, env.KITE_SECRET);

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

    const day = isMondayOrFridayInIST();

    let token, buffer;

    if (day) {
      token = 265;
      buffer = 45;
    } else {
      token = 256265;
      buffer = 15;
    }
    console.log(global.levels);
    // const balance = await kite.getMargins("equity");
    const lastOhlc = await getLastTradingDayOHLC(token);

    const todayData = await DailyLevelService.create(token);
    global.levels = todayData;
    console.log(global.levels);
  } catch (err) {
    console.log(err);
  }
}
