import { NextResponse } from 'next/server';
import { settingsOps, userOps, magicTokenOps } from '@/lib/db';
import { generateToken, hashToken, isValidEmail, isDomainAllowed, TOKEN_EXPIRY_MINUTES, generateMagicLink } from '@/lib/auth';

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

    // In production, send email here
    // For development, log the link
    console.log('=================================');
    console.log('Magic link for', email);
    console.log(magicLink);
    console.log('Expires in', TOKEN_EXPIRY_MINUTES, 'minutes');
    console.log('=================================');

    // TODO: Implement email sending
    // await sendEmail({
    //   to: email,
    //   subject: 'Your login link for Dashup',
    //   body: `Click here to log in: ${magicLink}\n\nThis link expires in ${TOKEN_EXPIRY_MINUTES} minutes.`
    // });

    return NextResponse.json({ 
      success: true, 
      message: 'Magic link sent! Check your email.',
      // Only include link in development for testing
      ...(process.env.NODE_ENV === 'development' && { magicLink })
    });
  } catch (error) {
    console.error('Failed to request magic link:', error);
    return NextResponse.json({ error: 'Failed to send login link' }, { status: 500 });
  }
}
