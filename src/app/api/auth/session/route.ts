import { NextResponse } from 'next/server';
import { sessionOps } from '@/lib/db';
import { hashToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false });
    }

    const sessionTokenHash = hashToken(sessionToken);
    const session = await sessionOps.getByTokenHash(sessionTokenHash);

    if (!session) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      needsRegistration: !session.user.name
    });
  } catch (error) {
    console.error('Failed to check session:', error);
    return NextResponse.json({ authenticated: false });
  }
}
