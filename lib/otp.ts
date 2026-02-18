import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Generates a 6-digit numeric OTP
 */
export function generateOTP(): string {
  // Generate a random number between 100000 and 999999
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP using bcrypt
 */
export async function hashOTP(otp: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
}

/**
 * Verifies an OTP against a hash
 */
export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
