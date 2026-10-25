// Category perishability hazard weights
const CATEGORY_PERISHABILITY = {
  'Prepared_Meals': 0.92,
  'Dairy': 0.82,
  'Produce': 0.76,
  'Baked_Goods': 0.68,
  'Refrigerated': 0.58,
  'Beverages': 0.35,
  'Dry_Goods': 0.18,
  'Other': 0.50
};

const sigmoid = (z) => 1 / (1 + Math.exp(-Math.max(-25, Math.min(25, z))));

const CALIBRATED_WEIGHTS = [1.35, 0.48, 1.65, 0.22, 0.18, 0.95];
const CALIBRATED_BIAS = -0.85;
const SCALER = {
  means: [0.6, 2.7, 0.15, 0.0, 0.28, 0.3],
  stds: [0.25, 0.8, 0.2, 0.7, 0.45, 0.25]
};

/**
 * Extracts raw numerical feature vector for a food batch
 */
const extractRawFeatures = (batch, cityUnclaimedRate = 0.25) => {
  const batchType = batch.batch_type && CATEGORY_PERISHABILITY[batch.batch_type] != null
    ? batch.batch_type
    : 'Other';
  const perishability = CATEGORY_PERISHABILITY[batchType];

  const weightKg = Math.max(0.5, parseFloat(batch.weight_kg) || 10.0);
  const logWeight = Math.log1p(weightKg);

  const now = Date.now();
  const expiryMs = batch.expiry_timestamp ? new Date(batch.expiry_timestamp).getTime() : now + 24 * 3600 * 1000;
  const remainingHours = Math.max(0.25, (expiryMs - now) / (1000 * 3600));
  const invRemainingHours = Math.min(4.0, 6.0 / remainingHours);

  const createdDate = batch.created_at ? new Date(batch.created_at) : new Date();
  const hour = createdDate.getHours();
  const sinHour = Math.sin((2 * Math.PI * hour) / 24);
  const day = createdDate.getDay();
  const isWeekend = (day === 0 || day === 6) ? 1.0 : 0.0;

  return [
    perishability,
    logWeight,
    invRemainingHours,
    sinHour,
    isWeekend,
    Math.max(0, Math.min(1, cityUnclaimedRate))
  ];
};

/**
 * Predicts spoilage risk (probability of expiring unclaimed) for a single batch
 */
const predictSpoilageRisk = (batch, cityUnclaimedRate = 0.25) => {
  const rawFeatures = extractRawFeatures(batch, cityUnclaimedRate);
  let z = CALIBRATED_BIAS;

  for (let i = 0; i < rawFeatures.length; i++) {
    const std = SCALER.stds[i] > 1e-6 ? SCALER.stds[i] : 1;
    const standardized = (rawFeatures[i] - SCALER.means[i]) / std;
    z += CALIBRATED_WEIGHTS[i] * standardized;
  }

  const probabilityPct = Number((sigmoid(z) * 100).toFixed(1));

  let riskTier = 'Low';
  let recommendedAction = 'Standard listing visibility';
  if (probabilityPct >= 70) {
    riskTier = 'Critical';
    recommendedAction = 'Urgent Rescue: Broadcast priority alert & expand search radius';
  } else if (probabilityPct >= 42) {
    riskTier = 'Moderate';
    recommendedAction = 'Prioritize in nearby NGO smart dispatch feed';
  }

  return {
    spoilage_probability: probabilityPct,
    risk_tier: riskTier,
    urgent_rescue_recommended: probabilityPct >= 70,
    recommended_action: recommendedAction
  };
};

module.exports = { predictSpoilageRisk };
