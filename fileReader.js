import fs from "fs";
import csv from "csv-parser";

// Load the CSV once and cache it
const instruments = [];

// Function to load CSV into memory (only once)
const loadInstruments = () => {
  return new Promise((resolve, reject) => {
    if (instruments.length > 0) {
      // Already loaded
      return resolve();
    }

    fs.createReadStream("complete.csv")
      .pipe(csv())
      .on("data", (row) => {
        instruments.push(row);
      })
      .on("end", () => {
        console.log("Instruments loaded");
        resolve();
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};

// Function to find instrument token
const findInstrumentToken = async (tradingSymbol) => {
  await loadInstruments();

  const instrument = instruments.find(
    (item) => item.tradingsymbol === tradingSymbol,
  );

  return instrument ?? null;
};

export default findInstrumentToken;
