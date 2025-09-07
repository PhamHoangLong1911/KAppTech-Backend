import mongoose from 'mongoose';

let cachedConnection: typeof mongoose | null = null;

const connectDB = async (): Promise<void> => {
  if (cachedConnection) {
    console.log('📁 Using existing database connection');
    return;
  }

  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);

    cachedConnection = mongoose;
    console.log(`📁 MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error('❌ Database connection error:', error.message);
    
    // In serverless, don't exit process on error
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    
    throw error; // Rethrow for proper error handling
  }
};

export default connectDB;
