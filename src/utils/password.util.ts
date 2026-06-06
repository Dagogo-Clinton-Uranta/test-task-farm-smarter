import bcrypt from 'bcryptjs';

/**
 * Password Generation Utility
 * Generates a random password and returns it (not hashed)
 * The password will be hashed by the User model's pre-save hook
 */

/**
 * Generate a random password
 * @returns Promise<string> - Plain text password (not hashed)
 */
export const generatePassword = async (): Promise<string> => {
  const length = 8;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@!$@$!*#*))_+';
  let password = '';

  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  // Return plain password (will be hashed by User model pre-save hook)
  return password;
};
