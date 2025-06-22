/* 
 * Rescue.net AI Backend Server
 * Main server file that initializes all services and routes
 * Built for Central India Hackathon 2.0
 * 
 * This server handles:
 * - Real-time health data from wearable devices
 * - Emergency detection and alerting
 * - Hospital and patient dashboard APIs
 * - AI/ML integration with Ollama
 * - WebSocket connections for real-time updates
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import route modules
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const hospitalRoutes = require('./routes/hospitals');
const healthDataRoutes = require('./routes/healthData');
const emergencyRoutes = require('./routes/emergency');
const aiRoutes = require('./routes/ai');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

// Import services
const EmergencyService = require('./services/emergencyService');
const AIService = require('./services/aiService');
const TelegramService = require('./services/telegramService');
const AIServiceClient = require('./services/aiServiceClient');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware setup
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors({
  origin: process.env.CORS_ORIGIN || [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://192.168.1.9:8080',
    'http://192.168.1.9:3000',
    'null' // Allow file:// origins for test dashboard
  ],
  credentials: true
}));
app.use(morgan('combined')); // Logging
app.use(limiter); // Rate limiting
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rescue_net_ai', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('📦 Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Initialize services
const emergencyService = new EmergencyService(io);
const aiService = new AIService();
const telegramService = new TelegramService();
const aiServiceClient = new AIServiceClient({
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000',
  timeout: 15000,
  retries: 3
});

// Test AI service connection on startup
aiServiceClient.checkHealth().then(result => {
  if (result.status === 'healthy') {
    console.log('✅ AI Service connected successfully');
  } else {
    console.log('⚠️  AI Service not available, using fallback mode');
  }
});

// Make services available globally
app.locals.services = {
  emergency: emergencyService,
  ai: aiService,
  telegram: telegramService,
  aiClient: aiServiceClient  // Add AI client
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/health-data', healthDataRoutes); // No auth for device data
app.use('/api/emergency', emergencyRoutes);
app.use('/api/ai', aiRoutes);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);
  
  // Join room based on user type
  socket.on('join-room', (data) => {
    const { userType, userId, hospitalId } = data;
    
    if (userType === 'hospital') {
      socket.join(`hospital-${hospitalId}`);
      console.log(`🏥 Hospital ${hospitalId} joined room`);
    } else if (userType === 'patient') {
      socket.join(`patient-${userId}`);
      console.log(`👤 Patient ${userId} joined room`);
    }
  });
  
  // Handle device data updates
  socket.on('device-data', async (data) => {
    try {
      // Process health data and check for emergencies
      const result = await emergencyService.processHealthData(data);
      
      if (result.emergency) {
        // Emit emergency alert to relevant rooms
        io.to(`patient-${data.patientId}`).emit('emergency-alert', result);
        io.to(`hospital-${data.hospitalId}`).emit('emergency-alert', result);
      }
      
      // Emit regular health update
      io.to(`patient-${data.patientId}`).emit('health-update', data);
      io.to(`hospital-${data.hospitalId}`).emit('health-update', data);
      
    } catch (error) {
      console.error('Error processing device data:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Catch-all route for undefined endpoints
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Rescue.net AI Backend Server Started');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🔗 External URL: http://192.168.1.9:${PORT}/api`);
  console.log('💓 Ready to save lives!');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('unhandledRejection', (err) => {
  console.error('🚨 Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
