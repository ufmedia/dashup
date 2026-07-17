'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Logo from '@/components/Logo';

interface Settings {
  logo_url: string;
  landing_image_url: string;
}

interface User {
  id: number;
  email: string;
  name: string | null;
  team_member_id: number | null;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);

  useEffect(() => {
    // Check for error params
    const error = searchParams.get('error');
    if (error) {
      const errorMessages: Record<string, string> = {
        invalid_token: 'Invalid or expired link. Please request a new one.',
        expired_token: 'This link has expired. Please request a new one.',
        used_token: 'This link has already been used. Please request a new one.',
        verification_failed: 'Verification failed. Please try again.'
      };
      setMessage({ type: 'error', text: errorMessages[error] || 'An error occurred.' });
    }

    // Check for existing session
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user.name) {
          setUser(data.user);
        } else if (data.authenticated && !data.user.name) {
          // Need to complete registration
          router.push('/auth/register');
          return;
        }
        return fetch('/api/settings');
      })
      .then(res => res?.json())
      .then(settingsData => {
        if (settingsData) {
          setSettings(settingsData);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setMagicLink(null);

    try {
      const res = await fetch('/api/auth/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Check your email for the login link!' });
        // In development, show the magic link
        if (data.magicLink) {
          setMagicLink(data.magicLink);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send login link' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send login link. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const continueToSubmit = () => {
    router.push('/submit');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600 text-xl font-light">Loading...</div>
      </div>
    );
  }

  // If user is already logged in, show welcome back screen
  if (user) {
    return (
      <div className="min-h-screen flex">
        {/* Left side - Image */}
        <div className="hidden lg:block lg:w-1/2 relative bg-gradient-to-br from-teal-600 to-teal-800">
          {settings?.landing_image_url ? (
            <Image
              src={settings.landing_image_url}
              alt="Welcome"
              fill
              className="object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white/80 px-12">
                <svg className="w-24 h-24 mx-auto mb-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-lg font-light">Add a landing image in Settings</p>
              </div>
            </div>
          )}
        </div>

        {/* Right side - Welcome back content */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 md:p-16 bg-white">
          <div className="w-full max-w-md">
            <div className="mb-12 text-center lg:text-left">
              <Logo className="mx-auto lg:mx-0" />
            </div>
            
            <div className="mb-8">
              <h2 className="text-3xl font-light text-gray-800 mb-2 tracking-wide">
                Welcome back, {user.name}
              </h2>
              <p className="text-gray-600 font-light">
                Ready to share your update for today?
              </p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={continueToSubmit}
                className="w-full py-4 bg-teal-700 text-white font-light rounded-xl hover:bg-teal-800 transition-all shadow-sm"
              >
                Continue to my update
              </button>
              <button
                onClick={handleLogout}
                className="w-full py-4 text-gray-600 font-light hover:text-gray-800 transition-all"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in - show email login form
  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gradient-to-br from-teal-600 to-teal-800">
        {settings?.landing_image_url ? (
          <Image
            src={settings.landing_image_url}
            alt="Welcome"
            fill
            className="object-cover"
            unoptimized
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white/80 px-12">
              <svg className="w-24 h-24 mx-auto mb-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-lg font-light">Add a landing image in Settings</p>
            </div>
          </div>
        )}
      </div>

      {/* Right side - Email login */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 md:p-16 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-12 text-center lg:text-left">
            <Logo className="mx-auto lg:mx-0" />
          </div>
          
          <div className="mb-8">
            <h2 className="text-3xl font-light text-gray-800 mb-2 tracking-wide">
              Welcome
            </h2>
            <p className="text-gray-600 font-light">
              Enter your email to receive a login link
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-xl font-light ${
              message.type === 'success' 
                ? 'bg-teal-50 border border-teal-200 text-teal-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}>
              {message.text}
            </div>
          )}

          {/* Development mode: Show magic link for testing */}
          {magicLink && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-amber-900 text-sm font-light mb-2">Development mode - Magic link:</p>
              <a 
                href={magicLink} 
                className="text-amber-800 underline break-all text-sm"
              >
                Click here to sign in
              </a>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                autoFocus
                disabled={submitting}
                className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none font-light text-lg disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className={`w-full py-4 rounded-xl font-light text-white transition-all ${
                submitting || !email.trim()
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-teal-700 hover:bg-teal-800 active:scale-[0.99]'
              }`}
            >
              {submitting ? 'Sending...' : 'Send login link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600 text-xl font-light">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
