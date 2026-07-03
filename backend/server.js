import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Configuration
import connectDB from './config/db.js';

// Middleware
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

// Socket Handler
import socketHandler from './socket/socketHandler.js';

// Load Env variables
dotenv.config();

// Connect DB
connectDB();

const app = express();
const server = http.createServer(app);

// Bind Socket.io with more robust ping/reconnect options
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
  // Improve connection stability: keepalive and transport fallbacks
  pingInterval: 25000, // server sends a ping every 25s
  pingTimeout: 60000, // wait up to 60s for pong before disconnect
  transports: ['websocket', 'polling'],
});

// Setup Socket Listeners
socketHandler(io);

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// CORS
app.use(cors({ origin: '*' }));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', limiter);

// Upload directory
const __dirname = path.resolve();
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/reports', reportRoutes);

// Health Check
app.get('/', (req, res) => {
  res.json({
    message: 'Bannari Amman Institute of Technology — Smart Infrastructure Audit API is running...',
    institution: 'BIT Sathyamangalam',
    version: '2.0.0',
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n====================================================`);
  console.log(`  Bannari Amman Institute of Technology`);
  console.log(`  Smart Infrastructure Audit System — Backend`);
  console.log(`  Server running on port ${PORT}`);
  console.log(`====================================================\n`);
});
