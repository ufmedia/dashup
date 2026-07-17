import { randomBytes, createHash } from 'crypto';

// Generate a secure random token
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// Hash a token for storage
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Verify master password from environment
export function verifyMasterPassword(password: string): boolean {
  const masterPassword = process.env.DASHUP_MASTER_PASSWORD;
  if (!masterPassword) {
    console.warn('DASHUP_MASTER_PASSWORD not set in environment');
    return false;
  }
  return password === masterPassword;
}

// Extract domain from email
export function getEmailDomain(email: string): string {
  const parts = email.toLowerCase().split('@');
  return parts.length === 2 ? parts[1] : '';
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check if email domain is allowed
export function isDomainAllowed(email: string, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) {
    return false; // No domains configured means no access
  }
  const domain = getEmailDomain(email);
  return allowedDomains.some(d => d.toLowerCase() === domain);
}

// Token expiry time (15 minutes)
export const TOKEN_EXPIRY_MINUTES = 15;

// Session cookie name
export const SESSION_COOKIE_NAME = 'dashup_session';

// Generate magic link URL
export function generateMagicLink(baseUrl: string, token: string): string {
  return `${baseUrl}/auth/verify?token=${token}`;
}
