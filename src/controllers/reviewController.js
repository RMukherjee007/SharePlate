const pool = require('../config/db');

/**
 * Fetch recent reviews to display in the UI.
 */
const getReviews = async (req, res) => {
  try {
    const query = `
      SELECT r.review_id, r.rating, r.comments, r.created_at, u.name as reviewer_name
      FROM Feedback_Reviews r
      JOIN Users u ON r.reviewer_id = u.user_id
      ORDER BY r.created_at DESC
      LIMIT 5;
    `;
    const [reviews] = await pool.execute(query);
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

/**
 * Submit a new review.
 * Note: To satisfy the strict schema without requiring users to log in,
 * this automatically binds the review to an existing claim/user.
 */
const createReview = async (req, res) => {
  const { rating, comments, name } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    // 1. Fetch a dummy claim and reviewer ID since we don't have auth right now
    const [claims] = await pool.execute('SELECT claim_id, charity_id FROM Claims LIMIT 1');
    if (claims.length === 0) {
      return res.status(400).json({ error: 'No claims exist yet. Please claim a batch first so we can attach the review to it!' });
    }

    const dummyClaimId = claims[0].claim_id;
    const dummyReviewerId = claims[0].charity_id;

    // 2. Insert the review
    const [result] = await pool.execute(
      'INSERT INTO Feedback_Reviews (claim_id, reviewer_id, rating, comments) VALUES (?, ?, ?, ?)',
      [dummyClaimId, dummyReviewerId, rating, comments || '']
    );

    res.status(201).json({
      message: 'Review submitted successfully!',
      review_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
};

module.exports = { getReviews, createReview };
