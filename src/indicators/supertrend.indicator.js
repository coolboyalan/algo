import { ATR } from "technicalindicators";

/**
 * Calculate Supertrend Indicator
 * @param {Array} candles - Array of objects: { high, low, close }
 * @param {number} period - ATR period (default 10)
 * @param {number} multiplier - Multiplier for ATR (default 3)
 * @returns {Array} - Array of { supertrend, trend }
 */
const calculateSupertrend = (candles, period = 7, multiplier = 2) => {
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);

  const atrValues = ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period,
  });

  const results = [];
  let finalUpperBand = 0;
  let finalLowerBand = 0;
  let trend = null;

  candles.forEach((candle, i) => {
    if (i < period) {
      results.push({ supertrend: null, trend: null });
      return;
    }

    const hl2 = (candle.high + candle.low) / 2;
    const atr = atrValues[i - period];

    const upperBand = hl2 + multiplier * atr;
    const lowerBand = hl2 - multiplier * atr;

    if (i === period) {
      finalUpperBand = upperBand;
      finalLowerBand = lowerBand;
    } else {
      const prevClose = closes[i - 1];

      if (upperBand < finalUpperBand || prevClose > finalUpperBand) {
        finalUpperBand = upperBand;
      }

      if (lowerBand > finalLowerBand || prevClose < finalLowerBand) {
        finalLowerBand = lowerBand;
      }
    }

    if (closes[i] > finalUpperBand) {
      trend = "up";
    } else if (closes[i] < finalLowerBand) {
      trend = "down";
    }

    const supertrendValue = trend === "up" ? finalLowerBand : finalUpperBand;

    results.push({ supertrend: supertrendValue, trend });
  });

  return results;
};

export default calculateSupertrend;
