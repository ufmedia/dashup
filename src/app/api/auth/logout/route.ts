import { NextResponse } from 'next/server';
import { sessionOps } from '@/lib/db';
import { hashToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      const sessionTokenHash = hashToken(sessionToken);
      await sessionOps.delete(sessionTokenHash);
    }

    // Clear the cookie
    cookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to logout:', error);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}
