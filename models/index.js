import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MongoDB Connection Manager
 * Handles database connection with retry logic and error handling
 */
class DatabaseConnection {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB with retry logic
   */
  async connect(uri = null) {
    const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/auto-doc-system';

    if (this.isConnected) {
      console.log('✓ Already connected to MongoDB');
      return this.connection;
    }

    try {
      mongoose.set('strictQuery', false);
      
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.connection = mongoose.connection;
      this.isConnected = true;

      console.log('✓ MongoDB connected successfully');
      console.log(`  Database: ${this.connection.name}`);
      console.log(`  Host: ${this.connection.host}:${this.connection.port}`);

      // Handle connection events
      this.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
        this.isConnected = false;
      });

      this.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        this.isConnected = false;
      });

      return this.connection;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('✓ MongoDB disconnected');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      name: mongoose.connection.name,
      host: mongoose.connection.host
    };
  }
}

// Singleton instance
const dbConnection = new DatabaseConnection();

export default dbConnection;
