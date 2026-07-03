const express = require('express');
const router = express.Router();

let clients = [];

/**
 * SSE Endpoint for real-time inventory updates
 */
router.get('/inventory', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Connected to inventory stream' })}\n\n`);

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

const broadcast = (data) => {
  clients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
};

module.exports = { router, broadcast };
