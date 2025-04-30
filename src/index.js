import calculateSupertrend from "#indicators/supertrend";
import env from "#configs/env";
import axios from "axios";
import crypto, { sign } from "crypto";
import { server, obj } from "#configs/server";
import fs from "fs";
import connectDb from "#configs/database";
import { KiteConnect } from "kiteconnect";
import { getLastTradingDayOHLC } from "#services/dailyLevel";
import cron from "node-cron";
import kite from "#configs/kite";
import findInstrumentToken from "../fileReader.js";

// await connectDb(env.DB_URI);

const levels = {
  tc: 24287.19,
  bc: 24204.57,
  r1: 24437.72,
  r2: 24546.93,
  r3: 24738.77,
  r4: 24847.98,
  s1: 24136.67,
  s2: 23944.83,
  s3: 23835.62,
  s4: 23643.78,
};

let lastTrade = null;
let lastAsset = null;

const STATE = "secureRandomString"; // Optional state value

server.get("/upstox-login", (req, res) => {
  const loginURL = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${env.UPSTOX_KEY}&redirect_uri=${encodeURIComponent(env.UPSTOX_REDIRECT_URI)}&state=${STATE}`;
  res.send(`<a href="${loginURL}">Login with Upstox</a>`);
  console.log("🔗 Opening Upstox login URL in browser...");
  open(loginURL);
});

server.get("/upstox-callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code) return res.status(400).send("Authorization code not provided");

  console.log("🔐 Received code:", code);
  console.log("🔁 Exchanging code for access token...");

  try {
    const tokenRes = await axios.post(
      "https://api.upstox.com/v2/login/authorization/token",
      new URLSearchParams({
        code,
        client_id: env.UPSTOX_KEY,
        client_secret: env.UPSTOX_SECRET,
        redirect_uri: env.UPSTOX_REDIRECT_URI,
        grant_type: "authorization_code",
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
      },
    );

    const { access_token, refresh_token, expires_at } = tokenRes.data;
    console.log("✅ Access Token:", access_token);

    res.send(`
      <h2>✅ Authentication Successful!</h2>
      <p><strong>Access Token:</strong> ${access_token}</p>
      <p><strong>Expires In:</strong> ${expires_at} seconds</p>
    `);
  } catch (err) {
    console.error(
      "❌ Token exchange failed:",
      err.response?.data || err.message,
    );
    res.status(500).send("Token exchange failed.");
  }
});

server.get("/", async (req, res) => {
  const { request_token } = req.query;
  obj["requestToken"] = request_token;

  const checksum = crypto
    .createHash("sha256")
    .update(env.KEY + obj.requestToken + env.SECRET)
    .digest("hex");

  try {
    const response = await axios.post(
      "https://api.kite.trade/session/token",
      new URLSearchParams({
        api_key: env.KEY,
        request_token: obj.requestToken,
        checksum: checksum,
      }),
      {
        headers: {
          "X-Kite-Version": "3",
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `token ${env.KEY}:${env.ACCESS_TOKEN}`,
        },
      },
    );

    console.log("API Response:", response.data);
    res.json(response.data);
    getHistoricalData();
  } catch (err) {
    console.log(err);
  }
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});

const API_KEY = obj.key;
const ACCESS_TOKEN = obj.accessToken;

const getHistoricalData = async (to, from) => {
  try {
    const INSTRUMENT_TOKEN = "26000"; // NIFTY 50
    const INTERVAL = "3minute";
    const FROM = from ?? "2025-04-15 09:15:00";
    const TO = to ?? "2025-04-15 09:18:00";

    const url = `https://api.kite.trade/instruments/historical/${INSTRUMENT_TOKEN}/${INTERVAL}`;
    const params = {
      from: FROM,
      to: TO,
    };

    const headers = {
      Authorization: `token ${env.KEY}:${env.ACCESS_TOKEN}`,
    };

    const { data } = await axios.get(url, { headers, params });

    const candles = data.data.candles.map((c) => ({
      time: c[0],
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
    }));

    const inputForSupertrend = candles.map((c) => ({
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const supertrendResult = calculateSupertrend(inputForSupertrend, 7, 2);

    const combined = candles.map((c, i) => ({
      ...c,
      supertrend: supertrendResult[i]?.supertrend ?? null,
      trend: supertrendResult[i]?.trend ?? null,
    }));

    // console.log(combined);
    // Write full data to text file
    const content = combined.map((r) => JSON.stringify(r)).join("\n");
    fs.writeFileSync("nifty_supertrend.txt", content, "utf8");

    console.log("✅ Full data written to nifty_supertrend.txt");
    return combined[0];
  } catch (error) {
    console.error("Failed to fetch or process data:", error);
  }
};

cron.schedule("* * * * * *", async () => {
  const now = new Date();

  try {
    const positions = await kite.getPositions();
    console.log(new Date());
    // console.log(positions, new Date());

    // Get IST time by adding offset to UTC
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);

    const hour = istNow.getUTCHours();
    const minute = istNow.getUTCMinutes();
    const second = istNow.getUTCSeconds();

    // Only run every 3 minutes at 00 second, between 09:18 and 15:30 IST
    const isInRange =
      (hour === 9 && minute >= 18) ||
      (hour > 9 && hour < 15) ||
      (hour === 15 && minute <= 30);
    //
    if (isInRange && minute % 3 === 0 && second === 0) {
      const formatDate = (dateObj) => {
        const y = dateObj.getUTCFullYear();
        const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getUTCDate()).padStart(2, "0");
        const h = String(dateObj.getUTCHours()).padStart(2, "0");
        const min = String(dateObj.getUTCMinutes()).padStart(2, "0");
        return `${y}-${m}-${d} ${h}:${min}:00`;
      };

      // TO = current IST time
      const toTime = formatDate(istNow);

      // FROM = IST time - 3 minutes
      const fromTime = formatDate(new Date(istNow.getTime() - 3 * 60 * 1000));
      let [data] = await kite.getHistoricalData(
        256265,
        // 265,
        "3minute",
        fromTime,
        toTime,
      );

      const { close: price } = data;

      if (price === null || price === undefined) {
        console.log("Invalid Price");
      }

      const { bc, tc, r1, r2, r3, r4, s1, s2, s3, s4 } = levels;

      const BUFFER = 15;
      let signal = "No Action";
      let reason = "Price is in a neutral zone.";
      let direction;
      let assetPrice;

      if (price % 100 > 50) {
        assetPrice = parseInt(price / 100) * 100 + 100;
      } else {
        assetPrice = parseInt(price / 100) * 100;
      }
      console.log(price, assetPrice, data);

      // If price is above TC and within TC + BUFFER, Buy
      if (price >= tc && price <= tc + BUFFER) {
        direction = "CE";
        signal = "Buy";
        reason = "Price is above TC within buffer.";
      }
      // If price is below BC and within BC - BUFFER, Sell
      else if (price <= bc && price >= bc - BUFFER) {
        direction = "PE";
        signal = "Sell";
        reason = "Price is below BC within buffer.";
      }
      // If price is between TC and BC, No Action
      else if (price < tc && price > bc && lastTrade) {
        direction = lastTrade;
        signal = "Exit";
        reason = "Price is within CPR range.";
      }

      const levelsMap = { r1, r2, r3, r4, s1, s2, s3, s4 };

      Object.entries(levelsMap).forEach(([levelName, level]) => {
        if (price > level && price <= level + BUFFER) {
          signal = "Buy";
          reason = `Price is above ${levelName} (${level}) within buffer.`;
          direction = "CE";
        } else if (price < level && price >= level - BUFFER) {
          signal = "Sell";
          reason = `Price is below ${levelName} (${level}) within buffer.`;
          direction = "PE";
        }
      });

      console.log(signal, reason);

      if (signal === "No Action") {
        return;
      }

      if (signal === "Exit") {
        await exitOrder(lastAsset);
        lastTrade = null;
        lastAsset = null;
        return;
      }

      const symbol = `NIFTY25430${assetPrice}${direction}`;

      if (lastTrade) {
        if (direction === lastTrade) return;
        await exitOrder(lastAsset);
        await newOrder(symbol);
        lastTrade = direction;
        lastAsset = symbol;
      } else {
        await newOrder(symbol);
        lastAsset = symbol;
        lastTrade = direction;
      }
    }
  } catch (e) {
    console.log(e);
    console.log(true);
  }
});

async function exitOrder(symbol) {
  console.log(`Sell order executed for ${symbol}`);
  const position = {
    tradingsymbol: symbol,
    exchange: "NFO",
    quantity: 75,
    product: "MIS", // or MIS/CNC
    transaction_type: "SELL", // original position was BUY
  };

  // const order = await kite.placeOrder("regular", {
  //   tradingsymbol: position.tradingsymbol,
  //   exchange: position.exchange,
  //   quantity: position.quantity,
  //   transaction_type: position.transaction_type,
  //   product: position.product,
  //   order_type: "MARKET", // square off immediately
  //   variety: "regular",
  // });

  // Order Payload
  const orderData = {
    product: "D",
    validity: "DAY",
    price: 0,
    tag: "", // you can leave it empty or give a string
    order_type: "MARKET",
    transaction_type: "SELL",
    disclosed_quantity: 0,
    trigger_price: 0,
    is_amo: false,
  };

  try {
    const instrument = await findInstrumentToken(symbol);
    orderData.quantity = instrument.lot_size;
    orderData.instrument_token = instrument.instrument_token;
    await placeOrder(orderData);
  } catch (error) {
    console.error(error.message);
  }

  // console.log(order);
  console.log(`Sell order executed for ${symbol}`);
}

// API Endpoint
const apiUrl = "https://api-hft.upstox.com/v2/order/place";

// Make the API Call
async function placeOrder(orderData) {
  try {
    const response = await axios.post(apiUrl, orderData, {
      headers: {
        Authorization: `Bearer ${env.UPSTOX_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    console.log("Order placed successfully:", response.data);
  } catch (error) {
    if (error.response) {
      // Server responded with a status other than 2xx
      console.error("Error placing order:", error.response.data);
    } else {
      // Some other error
      console.error("Error:", error.message);
    }
  }
}

async function newOrder(symbol) {
  console.log(`Buy order executed for ${symbol}`);
  const position = {
    tradingsymbol: symbol,
    exchange: "NFO",
    quantity: 75,
    product: "MIS", // or MIS/CNC
    transaction_type: "BUY",
  };

  // const order = await kite.placeOrder("regular", {
  //   tradingsymbol: position.tradingsymbol,
  //   exchange: position.exchange,
  //   quantity: position.quantity,
  //   transaction_type: position.transaction_type,
  //   product: position.product,
  //   order_type: "MARKET", // square off immediately
  //   variety: "regular",
  // });

  // Order Payload
  const orderData = {
    product: "D",
    validity: "DAY",
    price: 0,
    tag: "", // you can leave it empty or give a string
    order_type: "MARKET",
    transaction_type: "BUY",
    disclosed_quantity: 0,
    trigger_price: 0,
    is_amo: false,
  };

  try {
    const instrument = await findInstrumentToken(symbol);
    orderData.quantity = instrument.lot_size;
    orderData.instrument_token = instrument.instrument_token;
    await placeOrder(orderData);
  } catch (error) {
    lastTrade = null;
    lastAsset = null;

    console.error(error.message);
  }

  // console.log(order);
  console.log(`Buy order executed for ${symbol}`);
}

// exitOrder("SENSEX2542274000PE");

// cron.schedule("1 * * * *", async () => {
//   const now = new Date();
//
//   // Get IST time
//   const istOffset = 5.5 * 60 * 60 * 1000;
//   const istNow = new Date(now.getTime() + istOffset);
//   const data = await getLastTradingDayOHLC(265);
//   console.log(data)
// });

const token = await findInstrumentToken("NIFTY2543023000CE");
console.log(token);
