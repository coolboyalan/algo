import calculateSupertrend from "#indicators/supertrend";
import env from "#configs/env";
import axios from "axios";
import crypto, { sign } from "crypto";
import { server, obj, smartAPI } from "#configs/server";
import fs from "fs";
import connectDb from "#configs/database";
import { KiteConnect } from "kiteconnect";
import { getLastTradingDayOHLC } from "#services/dailyLevel";
import cron from "node-cron";
import kite from "#configs/kite";
import findInstrumentToken from "../fileReader.js";

import path from "path";
import { fileURLToPath } from "url";
import DailyLevelService from "#services/dailyLevel";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, "../OpenAPIScripMaster.json");
const rawData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

// Convert object to array if needed
const instrumentList = Array.isArray(rawData)
  ? rawData
  : Object.values(rawData);

/**
 * Finds instrument details by its tradingsymbol (e.g. "NIFTY08MAY2524850CE")
 */
function findInstrument(symbol) {
  return instrumentList.find((item) => item.symbol === symbol);
}

// Example usage
async function placeAngelOneOrder(symbol, transaction_type = "BUY") {
  const instrument = findInstrument(symbol);

  if (!instrument) {
    console.error("Instrument not found:", symbol);
    return;
  }

  const orderPayload = {
    variety: "NORMAL", // Always use NORMAL for Angel
    tradingsymbol: instrument.symbol,
    symboltoken: instrument.token,
    exchange: instrument.exch_seg,
    transactiontype: transaction_type, // BUY or SELL
    ordertype: "MARKET",
    producttype: "INTRADAY",
    duration: "DAY",
    quantity: parseInt(instrument.lotsize),
    price: "0", // MARKET order
    triggerprice: "0",
  };

  try {
    const response = await smartAPI.placeOrder(orderPayload);
    console.log("Angel One order placed successfully:", response);
  } catch (err) {
    console.error("Error placing Angel One order:", err.message || err);
  }
}

function convertToAngelOneSymbol(customSymbol) {
  const match = customSymbol.match(/^([A-Z]+)(\d{2})(\d)(\d{2})(\d+)(CE|PE)$/);
  if (!match) return null;

  const [_, name, year, month, day, strike, optionType] = match;

  const monthNames = [
    "",
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  const formattedSymbol = `${name}${day}${monthNames[parseInt(month)]}${parseInt(year)}${strike}${optionType}`;
  return formattedSymbol;
}

await connectDb(env.DB_URI);

global.levels = null;

let lastPrice;

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
    .update(env.KEY + obj.requestToken + env.KITE_SECRET)
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
          Authorization: `token ${env.KEY}:${env.KITE_ACCESS_TOKEN}`,
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
      Authorization: `token ${env.KEY}:${env.KITE_ACCESS_TOKEN}`,
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

let config = {
  method: "get",
  maxBodyLength: Infinity,
  url: "https://api.upstox.com/v2/user/profile",
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${env.UPSTOX_ACCESS_TOKEN}`,
  },
};

cron.schedule("* * * * * *", async () => {
  const now = new Date();
  try {
    const positions = await kite.getPositions();
    axios(config)
      .then((response) => {
        console.log(true, response.data.status);
      })
      .catch((error) => {
        console.log(error);
      });

    console.log(new Date());
    // Get IST time by adding offset to UTC
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);

    const hour = istNow.getUTCHours();
    const minute = istNow.getUTCMinutes();
    const second = istNow.getUTCSeconds();

    // Only run every 3 minutes at 00 second, between 09:18 and 15:30 IST
    const isInRange =
      (hour === 9 && minute >= 30) ||
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
        global.levels.token,
        "3minute",
        fromTime,
        toTime,
      );

      const { close: price } = data;

      if (price === null || price === undefined) {
        console.log("Invalid Price");
      }

      const { bc, tc, r1, r2, r3, r4, s1, s2, s3, s4 } = global.levels;

      const BUFFER = global.levels.buffer;
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

      const symbol = `SENSEX25513${assetPrice}${direction}`;

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

async function placeAngelOrder(orderData) {
  try {
    const response = await smartAPI.placeOrder(orderData);
    console.log("Angel One order placed successfully:", response);
  } catch (error) {
    console.error(
      "Error placing Angel One order:",
      error.response?.data || error.message,
    );
  }
}

async function exitOrder(symbol) {
  console.log(`Sell order executed for ${symbol}`);
  const position = {
    tradingsymbol: symbol,
    exchange: "BFO",
    quantity: 20,
    product: "MIS", // or MIS/CNC
    transaction_type: "SELL", // original position was BUY
  };

  try {
    const order = await kite.placeOrder("regular", {
      tradingsymbol: position.tradingsymbol,
      exchange: position.exchange,
      quantity: position.quantity,
      transaction_type: position.transaction_type,
      product: position.product,
      order_type: "MARKET", // square off immediately
      variety: "regular",
    });
    console.log("Kite placed");
  } catch (e) {
    console.log("Zerodha", e);
  }

  // Order Payload
  const orderData = {
    product: "I",
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
    orderData.instrument_token = instrument.instrument_key;
    await placeOrder(orderData);
  } catch (error) {
    console.error(error.message);
  }

  try {
    const angelSymbol = convertToAngelOneSymbol(symbol);
    await placeAngelOneOrder(angelSymbol, "SELL");
  } catch (err) {
    console.log("angel", err);
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
    exchange: "BFO",
    quantity: 20,
    product: "MIS", // or MIS/CNC
    transaction_type: "BUY",
  };

  try {
    const order = await kite.placeOrder("regular", {
      tradingsymbol: position.tradingsymbol,
      exchange: position.exchange,
      quantity: position.quantity,
      transaction_type: position.transaction_type,
      product: position.product,
      order_type: "MARKET", // square off immediately
      variety: "regular",
    });
    console.log("Kite placed");
  } catch (e) {
    lastTrade = null;
    lastAsset = null;
    console.log(e);
  }

  // Order Payload
  const orderData = {
    product: "I",
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
    orderData.instrument_token = instrument.instrument_key;
    await placeOrder(orderData);
    console.log("upstox placed");
  } catch (error) {
    lastTrade = null;
    false;
    lastAsset = null;

    console.error(error.message);
  }

  try {
    const angelSymbol = convertToAngelOneSymbol(symbol);
    await placeAngelOneOrder(angelSymbol, "BUY");
    console.log("Angel placed");
  } catch (err) {
    console.log("angel", err);
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
//
//
//

// const orderData = {
//   product: "I",
//   validity: "DAY",
//   price: 0,3
//   tag: "", // you can leave it empty or give a string
//   order_type: "MARKET",
//   transaction_type: "BUY",
//   disclosed_quantity: 0,
//   trigger_price: 0,
//   is_amo: false,
// };
//
// try {
//   const instrument = await findInstrumentToken("SENSEX2550679000PE");
//   orderData.quantity = instrument.lot_size;
//   orderData.instrument_token = instrument.instrument_key;
//   await placeOrder(orderData);
// } catch (error) {
//   lastTrade = null;
//   lastAsset = null;
//
//   console.error(error.message);
// }
//
//
const data = await DailyLevelService.get(null, { forDay: "2025-05-09" });
console.log(data);
const instrument = await findInstrumentToken("SENSEX2551380000CE");
console.log(instrument);
