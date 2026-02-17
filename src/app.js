import express from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import dbConnection from '../models/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message,
    statusCode: err.statusCode || 500
  });
});

// Start server (only if not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  // Connect to MongoDB
  dbConnection.connect()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch(err => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

export default app;
