require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// Middleware
// ===============================
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ===============================
// Static Frontend
// ===============================
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// ===============================
// API Routes
// ===============================
const apiRoutes = require('./routes/index');

// Debug check
console.log('Loaded API Routes:', typeof apiRoutes);

if (!apiRoutes) {
  throw new Error('routes/index.js is not exporting a router');
}

app.use('/api', apiRoutes);

// ===============================
// Health Check
// ===============================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hela Goviya API running',
    version: '1.0.0'
  });
});

// ===============================
// Frontend Catch-All Route
// ===============================
app.get('*all', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// ===============================
// 404 Handler
// ===============================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ===============================
// Global Error Handler
// ===============================
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ===============================
// Start Server
// ===============================
app.listen(PORT, () => {
  console.log(`\n🌿 Hela Goviya Server Running`);
  console.log(`🌐 Frontend : http://localhost:${PORT}`);
  console.log(`📡 API      : http://localhost:${PORT}/api`);
  console.log(`❤️ Health   : http://localhost:${PORT}/api/health\n`);
});

// ===============================
// Export App
// ===============================
module.exports = app;