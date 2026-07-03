const pool = require('../config/db');

const getSystemOverview = async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT COUNT(*) as total FROM Users');
    const [batches] = await pool.execute('SELECT COUNT(*) as total FROM Food_Batches');
    const [claims] = await pool.execute('SELECT COUNT(*) as total FROM Claims');
    
    // Get all users for admin table
    const [allUsers] = await pool.execute('SELECT user_id, role, name, address, is_verified FROM Users ORDER BY role');

    res.status(200).json({
      metrics: {
        totalUsers: users[0].total,
        totalBatches: batches[0].total,
        totalClaims: claims[0].total
      },
      users: allUsers
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to fetch admin overview' });
  }
};

const verifyNGO = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute(
      'UPDATE Users SET is_verified = TRUE WHERE user_id = ? AND role = "NGO"',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'NGO not found or already verified (or not an NGO).' });
    }

    res.status(200).json({ message: 'NGO verified successfully.' });
  } catch (error) {
    console.error('Verify NGO error:', error);
    res.status(500).json({ error: 'Failed to verify NGO' });
  }
};

module.exports = { getSystemOverview, verifyNGO };
