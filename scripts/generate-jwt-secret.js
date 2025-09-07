#!/usr/bin/env node

/**
 * JWT Secret Generator
 * Generates a cryptographically secure random string for JWT signing
 */

const crypto = require('crypto');

function generateJWTSecret(length = 64) {
  // Generate random bytes and convert to hexadecimal string
  const secret = crypto.randomBytes(length).toString('hex');
  return secret;
}

function generateBase64Secret(length = 64) {
  // Generate random bytes and convert to base64 string
  const secret = crypto.randomBytes(length).toString('base64');
  return secret;
}

console.log('🔐 JWT Secret Generator');
console.log('========================');
console.log();

console.log('📝 Hexadecimal JWT Secret (128 characters):');
console.log(generateJWTSecret(64));
console.log();

console.log('📝 Base64 JWT Secret:');
console.log(generateBase64Secret(64));
console.log();

console.log('📝 Shorter Hex Secret (64 characters):');
console.log(generateJWTSecret(32));
console.log();

console.log('💡 Usage:');
console.log('1. Copy one of the secrets above');
console.log('2. Update your .env file: JWT_SECRET=<your_secret_here>');
console.log('3. Restart your server');
console.log();

console.log('⚠️  Security Tips:');
console.log('- Never commit JWT secrets to version control');
console.log('- Use different secrets for development, staging, and production');
console.log('- Rotate secrets periodically in production');
console.log('- Keep secrets at least 32 bytes (64 hex characters) long');
