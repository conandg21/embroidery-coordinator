require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { activityLogger } = require('./middleware/logger');

const app = express();

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach activity logger to all requests
app.use(activityLogger);

// Rate limiting — protect against abuse
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

// Stricter limit on auth routes
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth/login', authLimiter);

// Serve uploaded files (with auth check handled in the files route)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/customers',require('./routes/customers'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/files',    require('./routes/files'));
app.use('/api/chat',     require('./routes/chat'));
app.use('/api/activity', require('./routes/activity'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🧵 Embroidery Coordinator API running on port ${PORT}`);
});
