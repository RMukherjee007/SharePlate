const pool = require('../config/db');

/**
 * Basic Demand Forecasting Algorithm
 * Analyzes historical food batches and claims to predict future demand.
 * Calculates resource allocation efficiency.
 */
const getForecastAndEfficiency = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    try {
      // 1. Calculate overall metrics (Weight, CO2, Meals, Efficiency)
      const [batchStats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_batches,
          SUM(weight_kg) as total_weight_kg,
          SUM(CASE WHEN status = 'claimed' THEN weight_kg ELSE 0 END) as claimed_weight_kg
        FROM Food_Batches
      `);
      
      const stats = batchStats[0];
      const totalWeight = parseFloat(stats.total_weight_kg) || 0;
      const claimedWeight = parseFloat(stats.claimed_weight_kg) || 0;
      
      // Prevent division by zero
      const currentEfficiency = totalWeight > 0 ? (claimedWeight / totalWeight) * 100 : 0;
      
      // Business Logic Formulas
      // 1 meal = 0.5 kg of food
      const equivalentMeals = Math.floor(claimedWeight / 0.5);
      // 1 kg of food waste prevented = 2.5 kg of CO2e prevented
      const co2Prevented = (claimedWeight * 2.5).toFixed(1);

      // 2. Simple Demand Forecasting based on City Grouping
      const query = `
        SELECT 
          delivery_city as city, 
          SUM(weight_kg) as total_supply, 
          SUM(CASE WHEN status = 'claimed' THEN weight_kg ELSE 0 END) as total_demand 
        FROM Food_Batches 
        GROUP BY delivery_city
      `;
      const [cityStats] = await connection.execute(query);

      const forecast = cityStats.map(stat => {
        const supply = parseFloat(stat.total_supply) || 0;
        const demand = parseFloat(stat.total_demand) || 0;
        const demandRatio = supply > 0 ? demand / supply : 0;
        let recommendation = '';
        if (demandRatio > 0.8) {
          recommendation = 'High Demand: Increase donor outreach in this area.';
        } else if (demandRatio < 0.4) {
          recommendation = 'Surplus Risk: Partner with more charities here to improve allocation.';
        } else {
          recommendation = 'Balanced: Supply and demand are relatively stable.';
        }

        return {
          city: stat.city || 'Unknown',
          supply: supply,
          demand: demand,
          demandRatio: demandRatio.toFixed(2),
          recommendation
        };
      });

      res.status(200).json({
        metrics: {
          totalWeightRescued: `${claimedWeight.toFixed(1)} kg`,
          co2Prevented: `${co2Prevented} kg`,
          equivalentMeals: equivalentMeals,
          currentAllocationEfficiency: `${currentEfficiency.toFixed(1)}%`,
        },
        forecast
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Forecasting Error:', error);
    res.status(500).json({ error: 'Failed to generate forecast and analytics' });
  }
};

module.exports = { getForecastAndEfficiency };
