import mongoose from 'mongoose';

let cachedConnection: typeof mongoose | null = null;
let isConnecting = false;
let connectionError: Error | null = null;

const connectDB = async (): Promise<void> => {
  // Return existing connection if available
  if (cachedConnection) {
    console.log('📁 Using existing database connection');
    return;
  }
  
  // If there was a previous connection error, don't try to reconnect immediately
  if (connectionError) {
    console.error('❌ Previous connection attempt failed:', connectionError.message);
    throw connectionError;
  }
  
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    console.log('📁 Database connection is in progress');
    // Wait for the connection to complete or fail
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (cachedConnection) return;
    if (connectionError) throw connectionError;
    throw new Error('Database connection attempt timeout');
  }
  
  isConnecting = true;
  
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      connectionError = new Error('MONGODB_URI is not defined in environment variables');
      throw connectionError;
    }
    
    console.log('📁 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);

    cachedConnection = mongoose;
    isConnecting = false;
    connectionError = null;
    console.log(`📁 MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    isConnecting = false;
    connectionError = error;
    console.error('❌ Database connection error:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    
    // In serverless, don't exit process on error
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    
    throw error; // Rethrow for proper error handling
  }
};

export default connectDB;
