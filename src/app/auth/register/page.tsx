'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is authenticated and needs registration
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          router.push('/');
        } else if (data.user.name) {
          // Already registered, redirect to submit
          router.push('/submit');
        } else {
          setEmail(data.user.email);
          setLoading(false);
        }
      })
      .catch(() => {
        router.push('/');
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/submit');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600 text-xl font-light">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Gradient background */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gradient-to-br from-teal-600 to-teal-800">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white/80 px-12">
            <svg className="w-24 h-24 mx-auto mb-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-lg font-light">Complete your profile</p>
          </div>
        </div>
      </div>

      {/* Right side - Registration form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 md:p-16 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-12 text-center lg:text-left">
            <Logo className="mx-auto lg:mx-0" />
          </div>
          
          <div className="mb-8">
            <h2 className="text-3xl font-light text-gray-800 mb-2 tracking-wide">
              Welcome!
            </h2>
            <p className="text-gray-600 font-light">
              Please enter your name to complete registration.
            </p>
            {email && (
              <p className="text-gray-500 text-sm mt-2 font-light">
                Signing in as {email}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl font-light">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-light text-gray-500 mb-3">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                autoFocus
                disabled={submitting}
                className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none font-light text-lg disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className={`w-full py-4 rounded-xl font-light text-white transition-all ${
                submitting || !name.trim()
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-teal-700 hover:bg-teal-800 active:scale-[0.99]'
              }`}
            >
              {submitting ? 'Completing...' : 'Complete Registration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
