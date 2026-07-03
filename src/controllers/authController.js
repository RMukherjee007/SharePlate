const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_dev_secret_key_123';

const register = async (req, res) => {
  const { email, password, role, name, address, base_city, latitude, longitude } = req.body;

  if (!email || !password || !role || !name) {
    return res.status(400).json({ error: 'Email, password, role, and name are required.' });
  }

  if (role !== 'NGO' && role !== 'Restaurant') {
    return res.status(400).json({ error: 'Role must be either NGO or Restaurant.' });
  }

  try {
    // Check if email already exists
    const [existing] = await pool.execute('SELECT user_id FROM Users WHERE email = ?', [email.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await pool.execute(`
      INSERT INTO Users (email, password_hash, role, name, address, base_city, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      email.trim(), 
      password_hash, 
      role, 
      name.trim(), 
      address || null, 
      base_city || null, 
      latitude || null, 
      longitude || null
    ]);

    const user_id = result.insertId;

    // Generate JWT (new users are unverified by default)
    const token = jwt.sign(
      { user_id, email: email.trim(), role, name: name.trim(), is_verified: false },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { user_id, email: email.trim(), role, name: name.trim(), is_verified: false }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password.' });
  }

  try {
    // Fetch user by email
    const [users] = await pool.execute('SELECT user_id, role, name, password_hash, email, is_verified FROM Users WHERE email = ?', [email.trim()]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    const user = users[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
    }

    // Issue JWT token
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role, name: user.name, is_verified: Boolean(user.is_verified) },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        name: user.name,
        is_verified: Boolean(user.is_verified)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

module.exports = { register, login, JWT_SECRET };
