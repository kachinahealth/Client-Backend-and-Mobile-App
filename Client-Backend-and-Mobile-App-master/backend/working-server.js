const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Server is running!'
  });
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// Registration endpoint for mobile app testing
app.post('/api/auth/register', (req, res) => {
  console.log('Registration attempt:', req.body);
  res.json({
    success: true,
    message: 'User registered successfully (test endpoint)',
    user: {
      id: 'test-user-id',
      email: req.body.email,
      status: 'pending'
    }
  });
});

// Login endpoint for mobile app testing
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  res.json({
    success: true,
    message: 'Login successful (test endpoint)',
    token: 'test-jwt-token',
    user: {
      id: 'test-user-id',
      email: req.body.email,
      status: 'active'
    }
  });
});

// Start server directly
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Working server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API test: http://localhost:${PORT}/api/test`);
  console.log(`📱 Mobile app can connect to: http://localhost:${PORT}/api/auth/register`);
  console.log(`🔑 Login endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log('\nPress Ctrl+C to stop the server');
});

// Keep the server running
process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
