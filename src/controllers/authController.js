const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

if (!process.env.JWT_SECRET) {
  console.warn('SECURITY WARNING: JWT_SECRET environment variable is not set! Using deterministic local dev secret.');
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.createHash('sha256').update(`shareplate-jwt-secret-${__dirname}`).digest('hex');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const register = async (req, res) => {
  const { email, password, role, name, address, base_city, latitude, longitude } = req.body;

  if (!email || !password || !role || !name) {
    return res.status(400).json({ error: 'Email, password, role, and name are required.' });
  }

  if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid input types.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 255) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'Password must be between 8 and 72 characters.' });
  }

  if (!trimmedName || trimmedName.length > 255) {
    return res.status(400).json({ error: 'Name must be between 1 and 255 characters.' });
  }

  if (role !== 'NGO' && role !== 'Restaurant') {
    return res.status(400).json({ error: 'Role must be either NGO or Restaurant.' });
  }

  try {
    // Check if email already exists
    const [existing] = await pool.execute('SELECT user_id FROM Users WHERE email = ?', [normalizedEmail]);
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
      normalizedEmail, 
      password_hash, 
      role, 
      trimmedName, 
      address ? String(address).trim().slice(0, 255) : null, 
      base_city ? String(base_city).trim().slice(0, 100) : null, 
      latitude || null, 
      longitude || null
    ]);

    const user_id = result.insertId;

    // Generate JWT (new users are unverified by default)
    const token = jwt.sign(
      { user_id, email: normalizedEmail, role, name: trimmedName, is_verified: false },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { user_id, email: normalizedEmail, role, name: trimmedName, is_verified: false }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Please provide email and password.' });
  }

  if (password.length > 72) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Fetch user by email
    const [users] = await pool.execute('SELECT user_id, role, name, password_hash, email, is_verified FROM Users WHERE email = ?', [normalizedEmail]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];

    // Compare passwords
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Issue JWT token
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role, name: user.name, is_verified: Boolean(user.is_verified) },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '30d' }
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
