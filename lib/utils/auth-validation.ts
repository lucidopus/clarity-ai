import { z } from 'zod';

/**
 * Shared password validation for frontend and backend.
 *
 * Requires at least 8 characters with:
 *  - one lowercase letter
 *  - one uppercase letter
 *  - one digit
 *  - one special (non-alphanumeric) character
 *
 * Any non-alphanumeric character counts as "special" (including spaces),
 * following NIST SP 800-63B guidance.
 */

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

export const PASSWORD_ERROR_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';

/** Zod string schema for password fields. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE);

/** Simple validation helper for client-side use. */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { isValid: false, error: 'Password must be at most 128 characters' };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return { isValid: false, error: PASSWORD_ERROR_MESSAGE };
  }
  return { isValid: true };
}
