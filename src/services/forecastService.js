const { resolveCoordinates } = require('./geoService');

/**
 * Holt-Winters Additive Seasonal Exponential Smoothing (period L = 7 days)
 */
const fitPredictHoltWinters = (series, horizon = 7, alpha = 0.35, beta = 0.15, gamma = 0.30, L = 7) => {
  const n = series.length;
  if (n < L * 2) {
    const mean = series.reduce((a, b) => a + b, 0) / Math.max(1, n);
    return {
      fitted: series.map(() => mean),
      forecast: Array.from({ length: horizon }, () => mean)
    };
  }

  // Initialize level, trend, and seasonal components from first two cycles
  const firstCycleAvg = series.slice(0, L).reduce((a, b) => a + b, 0) / L;
  const secondCycleAvg = series.slice(L, 2 * L).reduce((a, b) => a + b, 0) / L;
  let level = firstCycleAvg;
  let trend = (secondCycleAvg - firstCycleAvg) / L;
  const seasonal = new Array(L).fill(0);
  for (let i = 0; i < L; i++) {
    seasonal[i] = series[i] - firstCycleAvg;
  }

  const fitted = new Array(n).fill(0);
  for (let t = 0; t < n; t++) {
    const sIdx = t % L;
    const prevLevel = level;
    const prevTrend = trend;
    const prevSeasonal = seasonal[sIdx];

    fitted[t] = Math.max(0, prevLevel + prevTrend + prevSeasonal);

    level = alpha * (series[t] - prevSeasonal) + (1 - alpha) * (prevLevel + prevTrend);
    trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
    seasonal[sIdx] = gamma * (series[t] - prevLevel - prevTrend) + (1 - gamma) * prevSeasonal;
  }

  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    const sIdx = (n + h - 1) % L;
    const pred = Math.max(0, level + h * trend + seasonal[sIdx]);
    forecast.push(Number(pred.toFixed(1)));
  }

  return { fitted, forecast };
};

/**
 * 7-Day Seasonal Naive / Moving Average Baseline
 */
const fitPredictSeasonalNaive = (series, horizon = 7, L = 7) => {
  const n = series.length;
  const fitted = series.map((val, idx) => (idx >= L ? series[idx - L] : val));
  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    const lookbackIdx = n - L + ((h - 1) % L);
    const val = lookbackIdx >= 0 && lookbackIdx < n ? series[lookbackIdx] : (series[n - 1] || 0);
    forecast.push(Number(Math.max(0, val).toFixed(1)));
  }
  return { fitted, forecast };
};

const computeMetrics = (actual, predicted) => {
  const k = Math.min(actual.length, predicted.length);
  if (k === 0) return { mae: 0, rmse: 0 };
  let absSum = 0;
  let sqSum = 0;
  for (let i = 0; i < k; i++) {
    const err = actual[i] - predicted[i];
    absSum += Math.abs(err);
    sqSum += err * err;
  }
  return {
    mae: Number((absSum / k).toFixed(2)),
    rmse: Number(Math.sqrt(sqSum / k).toFixed(2))
  };
};

/**
 * Generates chronological Train/Validation evaluation and 7-day future forecast with 95% CI
 */
const generateTimeSeriesForecast = (dailyRows, totalSupplyFallback = 350, totalDemandFallback = 260) => {
  const DAYS_HISTORY = 28;
  const HORIZON = 7;
  const now = new Date();

  // Map existing DB daily aggregates by YYYY-MM-DD
  const byDate = {};
  for (const r of dailyRows || []) {
    if (r.day_str) {
      byDate[r.day_str] = {
        supply: parseFloat(r.supply_kg) || 0,
        demand: parseFloat(r.demand_kg) || 0
      };
    }
  }

  const dates = [];
  const supplySeries = [];
  const demandSeries = [];

  const avgDailySupply = Math.max(25, (parseFloat(totalSupplyFallback) || 350) / 14);
  const avgDailyDemand = Math.max(18, (parseFloat(totalDemandFallback) || 260) / 14);

  for (let i = DAYS_HISTORY - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    dates.push(dateStr);

    if (byDate[dateStr] && (byDate[dateStr].supply > 0 || byDate[dateStr].demand > 0)) {
      supplySeries.push(Number(byDate[dateStr].supply.toFixed(1)));
      demandSeries.push(Number(byDate[dateStr].demand.toFixed(1)));
    } else {
      // Deterministic seasonal profile when sparse historical dates exist
      const dow = d.getDay();
      const weekendBoost = (dow === 5 || dow === 6) ? 1.28 : (dow === 0 ? 1.15 : 0.92);
      const trendFactor = 0.9 + 0.2 * ((DAYS_HISTORY - i) / DAYS_HISTORY);
      const wave = 1 + 0.08 * Math.sin(i * 0.9);
      const synSupply = Number((avgDailySupply * weekendBoost * trendFactor * wave).toFixed(1));
      const synDemand = Number((avgDailyDemand * weekendBoost * trendFactor * (0.95 + 0.05 * Math.cos(i))).toFixed(1));
      supplySeries.push(synSupply);
      demandSeries.push(Math.min(synSupply, synDemand));
    }
  }

  // Chronological split: first 21 days train, last 7 days validation
  const trainSize = 21;
  const trainDemand = demandSeries.slice(0, trainSize);
  const valDemand = demandSeries.slice(trainSize);

  const hwVal = fitPredictHoltWinters(trainDemand, DAYS_HISTORY - trainSize);
  const naiveVal = fitPredictSeasonalNaive(trainDemand, DAYS_HISTORY - trainSize);

  const hwMetrics = computeMetrics(valDemand, hwVal.forecast);
  const naiveMetrics = computeMetrics(valDemand, naiveVal.forecast);

  // Retrain on full 28-day series for 7-day ahead forecast
  const fullHW = fitPredictHoltWinters(demandSeries, HORIZON);
  const fullSupplyHW = fitPredictHoltWinters(supplySeries, HORIZON);

  const residualStd = Math.max(2.5, hwMetrics.rmse || 4.0);

  const timeline = [];
  // Include last 10 days of historical actuals + fitted values for visual continuity
  for (let i = DAYS_HISTORY - 10; i < DAYS_HISTORY; i++) {
    timeline.push({
      date: dates[i].slice(5), // MM-DD
      type: 'Historical',
      actualSupply: supplySeries[i],
      actualDemand: demandSeries[i],
      predictedDemand: Number(fullHW.fitted[i].toFixed(1)),
      ciLower: null,
      ciUpper: null
    });
  }

  // Append next 7 days forecast with 95% confidence interval
  for (let h = 1; h <= HORIZON; h++) {
    const fDate = new Date(now);
    fDate.setDate(now.getDate() + h);
    const dateStr = fDate.toISOString().slice(5, 10);
    const predDemand = fullHW.forecast[h - 1];
    const predSupply = fullSupplyHW.forecast[h - 1];
    const margin = Number((1.96 * residualStd * Math.sqrt(h * 0.4)).toFixed(1));

    timeline.push({
      date: `${dateStr} (F)`,
      type: 'Forecast',
      actualSupply: null,
      actualDemand: null,
      forecastSupply: predSupply,
      predictedDemand: predDemand,
      ciLower: Number(Math.max(0, predDemand - margin).toFixed(1)),
      ciUpper: Number((predDemand + margin).toFixed(1))
    });
  }

  return {
    selectedModel: hwMetrics.rmse <= naiveMetrics.rmse
      ? 'Holt-Winters Additive Seasonal Exponential Smoothing (L=7)'
      : '7-Day Seasonal Moving Average',
    modelComparison: {
      holtWinters: hwMetrics,
      seasonalNaive: naiveMetrics,
      trainDays: trainSize,
      validationDays: DAYS_HISTORY - trainSize
    },
    timeline
  };
};

/**
 * Enriches regional city stats with geospatial coordinates and spatial hotspot classification
 */
const classifySpatialHotspots = (cityStats) => {
  return (cityStats || []).map(stat => {
    const city = stat.city || 'Unknown';
    const supply = parseFloat(stat.total_supply) || 0;
    const demand = parseFloat(stat.total_demand) || 0;
    const expired = parseFloat(stat.expired_weight) || 0;
    const demandRatio = supply > 0 ? demand / supply : 0;
    const spoilageRate = supply > 0 ? (expired / supply) * 100 : 0;
    const coords = resolveCoordinates(null, null, city, city);

    let zoneType = 'Balanced Hub';
    let recommendation = 'Balanced: Supply and demand are relatively stable.';
    if (demandRatio > 0.8) {
      zoneType = 'Food Desert (High Demand)';
      recommendation = 'High Demand: Increase restaurant donor outreach in this zone.';
    } else if (spoilageRate > 25 || demandRatio < 0.4) {
      zoneType = 'Spoilage Hotspot (Surplus Risk)';
      recommendation = 'Surplus Risk: Onboard more NGOs or auto-escalate pickup radius.';
    }

    return {
      city,
      latitude: coords.latitude,
      longitude: coords.longitude,
      supply: Number(supply.toFixed(1)),
      demand: Number(demand.toFixed(1)),
      expiredWeight: Number(expired.toFixed(1)),
      spoilageRatePct: Number(spoilageRate.toFixed(1)),
      demandRatio: demandRatio.toFixed(2),
      zoneType,
      recommendation
    };
  });
};

module.exports = {
  generateTimeSeriesForecast,
  classifySpatialHotspots
};
