import { NextResponse } from 'next/server';
import { userOps, magicTokenOps, sessionOps } from '@/lib/db';
import { hashToken, generateToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/?error=invalid_token', request.url));
    }

    const tokenHash = hashToken(token);
    
    // Find the token in database
    const magicToken = await magicTokenOps.getByTokenHash(tokenHash);

    if (!magicToken) {
      return NextResponse.redirect(new URL('/?error=invalid_token', request.url));
    }

    // Check if token is expired
    if (new Date(magicToken.expires_at) < new Date()) {
      return NextResponse.redirect(new URL('/?error=expired_token', request.url));
    }

    // Check if token was already used
    if (magicToken.used) {
      return NextResponse.redirect(new URL('/?error=used_token', request.url));
    }

    // Mark token as used
    await magicTokenOps.markUsed(magicToken.id);

    // Get or create user
    let user = await userOps.getByEmail(magicToken.email);
    if (!user) {
      user = await userOps.create(magicToken.email);
    }

    // Create session (expires in 7 days)
    const sessionToken = generateToken();
    const sessionTokenHash = hashToken(sessionToken);
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await sessionOps.create(user.id, sessionTokenHash, sessionExpiresAt);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: sessionExpiresAt,
      path: '/'
    });

    // Redirect based on registration status
    if (!user.name) {
      // User needs to complete registration
      return NextResponse.redirect(new URL('/auth/register', request.url));
    }

    // User is fully registered, redirect to submit page
    return NextResponse.redirect(new URL('/submit', request.url));
  } catch (error) {
    console.error('Failed to verify magic link:', error);
    return NextResponse.redirect(new URL('/?error=verification_failed', request.url));
  }
}
