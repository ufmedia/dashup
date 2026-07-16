'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Logo from '@/components/Logo';

interface TeamMember {
  id: number;
  name: string;
}

interface Settings {
  logo_url: string;
  landing_image_url: string;
}

export default function Home() {
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedUser, setSavedUser] = useState<TeamMember | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for saved user in localStorage
    const storedUserId = localStorage.getItem('dashup_user_id');
    const storedUserName = localStorage.getItem('dashup_user_name');
    const storedDate = localStorage.getItem('dashup_session_date');
    const today = new Date().toISOString().split('T')[0];

    // Clear session if day has changed
    if (storedDate && storedDate !== today) {
      localStorage.removeItem('dashup_user_id');
      localStorage.removeItem('dashup_user_name');
      localStorage.removeItem('dashup_session_date');
    } else if (storedUserId && storedUserName) {
      setSavedUser({ id: parseInt(storedUserId), name: storedUserName });
    }

    // Fetch team members and settings
    Promise.all([
      fetch('/api/team-members').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ])
      .then(([members, settingsData]) => {
        setTeamMembers(members);
        setSettings(settingsData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectUser = (member: TeamMember) => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('dashup_user_id', member.id.toString());
    localStorage.setItem('dashup_user_name', member.name);
    localStorage.setItem('dashup_session_date', today);
    router.push('/submit');
  };

  const handleMemberSelect = (member: TeamMember) => {
    setSelectedMember(member);
    setDropdownOpen(false);
  };

  const handleContinue = () => {
    if (selectedMember) {
      selectUser(selectedMember);
    }
  };

  const continueAsUser = () => {
    router.push('/submit');
  };

  const switchUser = () => {
    localStorage.removeItem('dashup_user_id');
    localStorage.removeItem('dashup_user_name');
    setSavedUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600 text-xl font-light">Loading...</div>
      </div>
    );
  }

  // If user already selected today, show welcome back screen (split screen)
  if (savedUser) {
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
                Welcome back, {savedUser.name}
              </h2>
              <p className="text-gray-600 font-light">
                Ready to share your update for today?
              </p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={continueAsUser}
                className="w-full py-4 bg-teal-700 text-white font-light rounded-xl hover:bg-teal-800 transition-all shadow-sm"
              >
                Continue to my update
              </button>
              <button
                onClick={switchUser}
                className="w-full py-4 text-gray-600 font-light hover:text-gray-800 transition-all"
              >
                Not {savedUser.name}? Switch user
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // First time or day rolled over - show split screen user selection
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

      {/* Right side - User selection */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 md:p-16 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-12 text-center lg:text-left">
            <Logo className="mx-auto lg:mx-0" />
          </div>
          
          <div className="mb-8">
            <h2 className="text-3xl font-light text-gray-800 mb-2 tracking-wide">
              Good to see you
            </h2>
            <p className="text-gray-600 font-light">
              Who are you?
            </p>
          </div>

          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-6 font-light">No team members yet.</p>
              <a
                href="/admin"
                className="inline-block px-6 py-3 bg-teal-700 text-white font-light rounded-xl hover:bg-teal-800 transition-all"
              >
                Add team members in Settings
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dropdown for name selection */}
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none bg-white text-left flex justify-between items-center"
                >
                  <span className={`font-light text-lg ${selectedMember ? 'text-gray-800' : 'text-gray-400'}`}>
                    {selectedMember ? selectedMember.name : 'Select your name...'}
                  </span>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {dropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto">
                    {teamMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleMemberSelect(member)}
                        className={`w-full px-5 py-4 text-left hover:bg-teal-50 font-light text-gray-700 transition-colors ${
                          selectedMember?.id === member.id ? 'bg-teal-50 text-teal-800' : ''
                        }`}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Continue button */}
              <button
                onClick={handleContinue}
                disabled={!selectedMember}
                className={`w-full py-4 rounded-xl font-light text-white transition-all ${
                  selectedMember
                    ? 'bg-teal-700 hover:bg-teal-800 active:scale-[0.99]'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
