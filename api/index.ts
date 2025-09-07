import app from '../src/server';

// Add global unhandled promise rejection handling
process.on('unhandledRejection', (reason: any, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process in production/Vercel environment
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit process in production/Vercel environment
});

// Export the Express app
export default app;
