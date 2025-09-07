// Check for required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please set these variables in your .env file or Vercel project settings');
  
  // In production, add dummy values to prevent immediate crash but log the error
  if (process.env.NODE_ENV === 'production') {
    console.error('Setting dummy values for missing environment variables (THIS IS INSECURE)');
    missingEnvVars.forEach(envVar => {
      process.env[envVar] = `dummy-${envVar}-value`;
    });
  }
}

// Make sure JWT_SECRET is secure
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32 && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ JWT_SECRET should be at least 32 characters long for security');
}

export {};
