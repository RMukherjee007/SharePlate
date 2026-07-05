const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
require('dotenv').config();

const { globalLimiter } = require('./middleware/rateLimiter');
const batchRoutes = require('./routes/batchRoutes');
const claimRoutes = require('./routes/claimRoutes');
const sampleRoutes = require('./routes/sampleRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { router: streamRoutes, broadcast } = require('./routes/streamRoutes');
const { redisSubscriber } = require('./config/redis');
const { startExpiryDetection } = require('./services/expiryService');

const app = express();
const PORT = process.env.PORT || 5001;

// Trust the first proxy in production for accurate IP rate limiting
app.set('trust proxy', 1);

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());

// Apply global rate limiting (100 req / 15 min)
app.use(globalLimiter);

// Routes
app.use('/api/batches', batchRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/sample', sampleRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/stream', streamRoutes);

// Serve static files from the React frontend app with caching
app.use(express.static(path.join(__dirname, '../client/dist'), { maxAge: '1y' }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Food Waste Redistribution Platform Backend is running' });
});

// Explicit 404 for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Catch-all route to serve React's index.html for client-side routing
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  } else {
    next();
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`
   Server is running on http://localhost:${PORT}
   Rate Limiting: 100 req / 15 min
   MySQL Connectivity: Pool Initialized
   Redis: Client Initialized
  `);

  // Start Background Services
  startExpiryDetection();

  try {
    if (redisSubscriber.isOpen) {
      await redisSubscriber.subscribe('inventory_updates', (message) => {
        console.log('SSE Broadcast:', message);
        broadcast(message);
      });
      console.log('   Redis: Subscribed to inventory_updates channel');
    }
  } catch (err) {
    console.error('   Redis: Failed to subscribe', err);
  }
});
