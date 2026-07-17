import Mailgun from 'mailgun.js';
import formData from 'form-data';

const mailgun = new Mailgun(formData);

// Initialize Mailgun client
function getMailgunClient() {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  
  if (!apiKey || !domain) {
    return null;
  }
  
  return mailgun.client({
    username: 'api',
    key: apiKey,
    // Use EU endpoint if configured
    url: process.env.MAILGUN_EU === 'true' ? 'https://api.eu.mailgun.net' : undefined
  });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const client = getMailgunClient();
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM || `DashUp <noreply@${domain}>`;
  
  if (!client || !domain) {
    console.warn('Mailgun not configured - email not sent');
    console.log('Would have sent email to:', options.to);
    console.log('Subject:', options.subject);
    console.log('Body:', options.text);
    return false;
  }
  
  try {
    await client.messages.create(domain, {
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    });
    
    console.log('Email sent successfully to:', options.to);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export async function sendMagicLinkEmail(email: string, magicLink: string, expiryMinutes: number): Promise<boolean> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'DashUp';
  
  const text = `
Hi there,

Click the link below to sign in to ${appName}:

${magicLink}

This link will expire in ${expiryMinutes} minutes.

If you didn't request this link, you can safely ignore this email.

Thanks,
The ${appName} Team
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-weight: 300; font-size: 28px;">${appName}</h1>
  </div>
  
  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">Hi there,</p>
    
    <p>Click the button below to sign in to ${appName}:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLink}" style="display: inline-block; background: #0d9488; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 500;">Sign In</a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
    <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 13px; color: #4b5563;">${magicLink}</p>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This link will expire in ${expiryMinutes} minutes.</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #9ca3af; font-size: 13px; margin-bottom: 0;">If you didn't request this link, you can safely ignore this email.</p>
  </div>
</body>
</html>
`.trim();

  return sendEmail({
    to: email,
    subject: `Sign in to ${appName}`,
    text,
    html
  });
}
