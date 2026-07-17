import { NextResponse } from 'next/server';
import { settingsOps, userOps, magicTokenOps } from '@/lib/db';
import { generateToken, hashToken, isValidEmail, isDomainAllowed, TOKEN_EXPIRY_MINUTES, generateMagicLink } from '@/lib/auth';
import { sendMagicLinkEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Get allowed domains from settings
    const settings = await settingsOps.getAll();
    
    if (!settings.allowed_email_domains || settings.allowed_email_domains.length === 0) {
      return NextResponse.json({ error: 'No email domains have been configured. Please contact an administrator.' }, { status: 403 });
    }

    // Validate email domain
    if (!isDomainAllowed(email, settings.allowed_email_domains)) {
      return NextResponse.json({ error: 'Your email domain is not authorized to access this application' }, { status: 403 });
    }

    // Generate magic token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    // Store token in database
    await magicTokenOps.create(email, tokenHash, expiresAt);

    // Get or create user
    let user = await userOps.getByEmail(email);
    if (!user) {
      user = await userOps.create(email);
    }

    // Generate magic link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    const magicLink = generateMagicLink(baseUrl, token);

    // Send the magic link email
    const emailSent = await sendMagicLinkEmail(email, magicLink, TOKEN_EXPIRY_MINUTES);
    
    // Log for debugging (always helpful in production logs)
    console.log(`Magic link requested for ${email}, email sent: ${emailSent}`);
    
    // In development, also show the link directly
    if (process.env.NODE_ENV === 'development') {
      console.log('=================================');
      console.log('Magic link for', email);
      console.log(magicLink);
      console.log('=================================');
    }

    return NextResponse.json({ 
      success: true, 
      message: emailSent ? 'Magic link sent! Check your email.' : 'Magic link generated (check server logs if email not configured).',
      // Only include link in development for testing
      ...(process.env.NODE_ENV === 'development' && { magicLink })
    });
  } catch (error) {
    console.error('Failed to request magic link:', error);
    return NextResponse.json({ error: 'Failed to send login link' }, { status: 500 });
  }
}
