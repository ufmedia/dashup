import { NextResponse } from 'next/server';
import { settingsOps } from '@/lib/db';

export async function GET() {
  try {
    const settings = await settingsOps.getAll();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { logo_url, landing_image_url, allowed_email_domains } = body;

    await settingsOps.update({ 
      logo_url, 
      landing_image_url,
      allowed_email_domains 
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
