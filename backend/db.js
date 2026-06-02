import mongoose from 'mongoose';
import 'dotenv/config';

// To ensure MongoDB is connected before the server starts handling requests
export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.warn('⚠️  WARNING: MONGO_URI is not set. The application will FAIL to connect to the database.');
    } else {
      await mongoose.connect(uri);
      console.log('✅  MongoDB connected successfully!');
    }
  } catch (error) {
    console.error('❌  MongoDB connection error:', error);
    process.exit(1);
  }
};

// Export randomUUID polyfill for backwards compatibility with previous routes during migration
import { randomUUID } from 'crypto';
export { randomUUID };
