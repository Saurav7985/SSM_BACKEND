const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const http = require('http');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const { setSocketIo } = require('./src/services/notification.service');

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [],
    credentials: true,
  }
});

// Pass io to Notification Service
setSocketIo(io);

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join role-based or user-specific rooms
  socket.on('join', ({ userId, role }) => {
    if (role === 'SUPER_ADMIN') {
      socket.join('super_admins');
    }
    if (role === 'ADMIN') {
      socket.join(`admin_${userId}`);
    }
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Basic Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    database: dbStatus
  });
});

// Global Maintenance Middleware
const maintenanceMiddleware = require('./src/middleware/maintenance.middleware');
app.use(maintenanceMiddleware);

// Routes
app.use('/api/auth', require('./src/routes/auth.route'));
app.use('/api/users', require('./src/routes/user.route'));
app.use('/api/admins', require('./src/routes/admin.route'));
app.use('/api/plans', require('./src/routes/plan.route'));
app.use('/api/subscriptions', require('./src/routes/subscription.route'));
app.use('/api/stats', require('./src/routes/stats.route'));
app.use('/api/search', require('./src/routes/search.route'));
app.use('/api/credits', require('./src/routes/credit.route'));
app.use('/api/notifications', require('./src/routes/notification.route'));
app.use('/api/sessions', require('./src/routes/session.route'));
app.use('/api/activity', require('./src/routes/activity.route'));
app.use('/api/settings', require('./src/routes/settings.route'));
app.use('/api/audit-logs', require('./src/routes/auditLog.route'));
app.use('/api/social', require('./src/routes/social.route'));

// Global Error Handler
const errorHandler = require('./src/middleware/error.middleware');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
