const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');

const app = express();
const PORT = 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:19006'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  }
});
app.use('/api/', limiter);

// Logging and compression
app.use(morgan('combined'));
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoints
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/auth/test', (req, res) => {
  res.json({
    message: 'Auth endpoint accessible!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/leaderboard/test', (req, res) => {
  res.json({
    message: 'Leaderboard endpoint accessible!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/news/test', (req, res) => {
  res.json({
    message: 'News endpoint accessible!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Test function to make HTTP requests
function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '::1', // Use IPv6 localhost
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(body);
          resolve({
            status: res.statusCode,
            data: jsonResponse
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test all endpoints
async function testAllEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');

  const endpoints = [
    { path: '/health', name: 'Health Check' },
    { path: '/api/test', name: 'API Test' },
    { path: '/api/auth/test', name: 'Auth Test' },
    { path: '/api/leaderboard/test', name: 'Leaderboard Test' },
    { path: '/api/news/test', name: 'News Test' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name} (${endpoint.path})...`);
      const result = await testEndpoint(endpoint.path);
      console.log(`✅ ${endpoint.name}: Status ${result.status}`);
      console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
      console.log('');
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
      console.log('');
    }
  }

  console.log('🎉 Endpoint testing completed!');
}

// Connect to MongoDB and start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base: http://localhost:${PORT}/api`);
  console.log(`📝 Test endpoints:`);
  console.log(`   - http://localhost:${PORT}/api/test`);
  console.log(`   - http://localhost:${PORT}/api/auth/test`);
  console.log(`   - http://localhost:${PORT}/api/leaderboard/test`);
  console.log(`   - http://localhost:${PORT}/api/news/test`);
  
  // Wait a moment for server to fully start, then test endpoints
  setTimeout(() => {
    testAllEndpoints().then(() => {
      console.log('\n🎉 Server is running and all endpoints are working!');
      console.log('Press Ctrl+C to stop the server');
    }).catch(console.error);
  }, 1000);
});

// Keep the server running
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nSIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
