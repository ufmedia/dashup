import { NextResponse } from 'next/server';
import { verifyMasterPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    if (!verifyMasterPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Create a response with success
    const response = NextResponse.json({ success: true });
    
    // Set admin session cookie (expires in 24 hours)
    response.cookies.set('dashup_admin', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Failed to verify admin password:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
