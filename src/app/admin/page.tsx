'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Logo from '@/components/Logo';

interface TeamMember {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
}

interface Settings {
  logo_url: string;
  landing_image_url: string;
  allowed_email_domains: string[];
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<Settings>({ logo_url: '', landing_image_url: '', allowed_email_domains: [] });
  const [newTeamMember, setNewTeamMember] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [landingImageUrl, setLandingImageUrl] = useState('');
  const [emailDomains, setEmailDomains] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if already authenticated via cookie
  useEffect(() => {
    // Check for admin cookie by making a test request
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          // Check if admin cookie exists (we'll trust the server-side check)
          const cookies = document.cookie.split(';');
          const hasAdminCookie = cookies.some(c => c.trim().startsWith('dashup_admin='));
          if (hasAdminCookie) {
            setAuthenticated(true);
          }
        }
      } catch {
        // Not authenticated
      }
    };
    checkAuth();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        setAuthenticated(true);
        setPassword('');
      } else {
        const data = await res.json();
        setAuthError(data.error || 'Invalid password');
      }
    } catch {
      setAuthError('Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [tmRes, projRes, settingsRes] = await Promise.all([
        fetch('/api/team-members'),
        fetch('/api/projects'),
        fetch('/api/settings')
      ]);
      
      if (tmRes.ok) {
        setTeamMembers(await tmRes.json());
      }
      if (projRes.ok) {
        setProjects(await projRes.json());
      }
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
        setLogoUrl(settingsData.logo_url || '');
        setLandingImageUrl(settingsData.landing_image_url || '');
        setEmailDomains(settingsData.allowed_email_domains || []);
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchData();
    }
  }, [authenticated, fetchData]);

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3000);
  };

  // Team Member CRUD
  const addTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamMember.trim()) return;

    try {
      const res = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamMember.trim() })
      });

      if (res.ok) {
        setNewTeamMember('');
        fetchData();
        showMessage('Team member added successfully');
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to add team member', true);
      }
    } catch {
      showMessage('Failed to add team member', true);
    }
  };

  const updateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeamMember || !editingTeamMember.name.trim()) return;

    try {
      const res = await fetch(`/api/team-members/${editingTeamMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingTeamMember.name.trim() })
      });

      if (res.ok) {
        setEditingTeamMember(null);
        fetchData();
        showMessage('Team member updated successfully');
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to update team member', true);
      }
    } catch {
      showMessage('Failed to update team member', true);
    }
  };

  const deleteTeamMember = async (id: number) => {
    if (!confirm('Are you sure you want to delete this team member?')) return;

    try {
      const res = await fetch(`/api/team-members/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        showMessage('Team member deleted successfully');
      } else {
        showMessage('Failed to delete team member', true);
      }
    } catch {
      showMessage('Failed to delete team member', true);
    }
  };

  // Project CRUD
  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProject.trim() })
      });

      if (res.ok) {
        setNewProject('');
        fetchData();
        showMessage('Project added successfully');
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to add project', true);
      }
    } catch {
      showMessage('Failed to add project', true);
    }
  };

  const updateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editingProject.name.trim()) return;

    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingProject.name.trim() })
      });

      if (res.ok) {
        setEditingProject(null);
        fetchData();
        showMessage('Project updated successfully');
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to update project', true);
      }
    } catch {
      showMessage('Failed to update project', true);
    }
  };

  const deleteProject = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        showMessage('Project deleted successfully');
      } else {
        showMessage('Failed to delete project', true);
      }
    } catch {
      showMessage('Failed to delete project', true);
    }
  };

  // Email Domains
  const addDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;
    
    // Basic domain validation
    if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/.test(domain)) {
      showMessage('Please enter a valid domain (e.g., example.com)', true);
      return;
    }
    
    if (emailDomains.includes(domain)) {
      showMessage('This domain is already in the list', true);
      return;
    }
    
    setEmailDomains([...emailDomains, domain]);
    setNewDomain('');
  };

  const removeDomain = (domain: string) => {
    setEmailDomains(emailDomains.filter(d => d !== domain));
  };

  const saveEmailDomains = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_url: settings.logo_url,
          landing_image_url: settings.landing_image_url,
          allowed_email_domains: emailDomains
        })
      });

      if (res.ok) {
        setSettings({ ...settings, allowed_email_domains: emailDomains });
        showMessage('Email domains saved');
      } else {
        showMessage('Failed to save email domains', true);
      }
    } catch {
      showMessage('Failed to save email domains', true);
    }
  };

  // Branding Settings
  const saveSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_url: logoUrl.trim(),
          landing_image_url: landingImageUrl.trim(),
          allowed_email_domains: emailDomains
        })
      });

      if (res.ok) {
        setSettings({ 
          logo_url: logoUrl.trim(), 
          landing_image_url: landingImageUrl.trim(),
          allowed_email_domains: emailDomains
        });
        showMessage('Branding settings saved');
      } else {
        showMessage('Failed to save settings', true);
      }
    } catch {
      showMessage('Failed to save settings', true);
    }
  };

  // Show password prompt if not authenticated
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Logo className="mx-auto" />
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h1 className="text-2xl font-light text-gray-800 mb-2 text-center tracking-wide">
              Settings Access
            </h1>
            <p className="text-gray-600 text-center mb-6 font-light">
              Enter the master password to continue
            </p>

            {authError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl font-light">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter master password"
                autoFocus
                disabled={authLoading}
                className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none font-light disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={authLoading || !password}
                className={`w-full py-4 rounded-xl font-light text-white transition-all ${
                  authLoading || !password
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-teal-700 hover:bg-teal-800'
                }`}
              >
                {authLoading ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-gray-500 hover:text-gray-700 font-light text-sm">
              ← Back to home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <div className="mb-4">
            <Logo />
          </div>
          <h1 className="text-3xl font-light text-gray-800 tracking-wide">Settings</h1>
          <p className="text-gray-600 mt-3 font-light">Manage your team, projects, authentication, and branding</p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 p-5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl font-light">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-5 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl font-light">
            {success}
          </div>
        )}

        {/* Email Domains Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-10">
          <h2 className="text-lg font-light text-gray-700 mb-2">Allowed Email Domains</h2>
          <p className="text-gray-500 text-sm font-light mb-6">
            Users can only sign in with email addresses from these domains
          </p>
          
          <form onSubmit={addDomain} className="mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com"
                className="flex-1 px-5 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none font-light"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-colors font-light"
              >
                Add
              </button>
            </div>
          </form>

          {emailDomains.length > 0 ? (
            <div className="space-y-2 mb-6">
              {emailDomains.map((domain) => (
                <div key={domain} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-700 font-light">{domain}</span>
                  <button
                    onClick={() => removeDomain(domain)}
                    className="px-4 py-2 text-rose-800 hover:bg-rose-50 rounded-lg transition-colors font-light"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-6 bg-gray-50 rounded-xl mb-6 font-light">
              No domains configured. Users won&apos;t be able to sign in until you add at least one domain.
            </div>
          )}

          <button
            onClick={saveEmailDomains}
            className="px-6 py-3 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-colors font-light"
          >
            Save Email Domains
          </button>
        </div>

        {/* Branding Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-10">
          <h2 className="text-lg font-light text-gray-700 mb-6">Branding</h2>
          
          <div className="space-y-8">
            {/* Logo URL */}
            <div>
              <label className="block text-sm font-light text-gray-500 mb-3">
                Logo URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none font-light"
              />
              {logoUrl && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-2 font-light">Preview:</p>
                  <Image
                    src={logoUrl}
                    alt="Logo preview"
                    width={150}
                    height={50}
                    className="h-12 w-auto object-contain"
                    unoptimized
                  />
                </div>
              )}
            </div>

            {/* Landing Image URL */}
            <div>
              <label className="block text-sm font-light text-gray-500 mb-3">
                Landing Page Image URL
              </label>
              <input
                type="url"
                value={landingImageUrl}
                onChange={(e) => setLandingImageUrl(e.target.value)}
                placeholder="https://example.com/hero-image.jpg"
                className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none font-light"
              />
              <p className="text-xs text-gray-500 mt-2 font-light">
                This image appears on the left side of the landing page. Recommended: 1080×1920px or similar portrait orientation.
              </p>
              {landingImageUrl && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-2 font-light">Preview:</p>
                  <Image
                    src={landingImageUrl}
                    alt="Landing image preview"
                    width={200}
                    height={300}
                    className="w-48 h-64 object-cover rounded-lg"
                    unoptimized
                  />
                </div>
              )}
            </div>

            <button
              onClick={saveSettings}
              className="px-6 py-3 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-colors font-light"
            >
              Save Branding
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Team Members Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-lg font-light text-gray-700 mb-6">Team Members</h2>
            
            {/* Add Form */}
            <form onSubmit={addTeamMember} className="mb-8">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTeamMember}
                  onChange={(e) => setNewTeamMember(e.target.value)}
                  placeholder="Enter name"
                  className="flex-1 px-5 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none font-light"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-colors font-light"
                >
                  Add
                </button>
              </div>
            </form>

            {/* List */}
            <ul className="space-y-3">
              {teamMembers.map((tm) => (
                <li key={tm.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  {editingTeamMember?.id === tm.id ? (
                    <form onSubmit={updateTeamMember} className="flex-1 flex gap-3">
                      <input
                        type="text"
                        value={editingTeamMember.name}
                        onChange={(e) => setEditingTeamMember({ ...editingTeamMember, name: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-200 outline-none font-light"
                        autoFocus
                      />
                      <button type="submit" className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 font-light">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTeamMember(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-light"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="flex-1 text-gray-700 font-light">{tm.name}</span>
                      <button
                        onClick={() => setEditingTeamMember(tm)}
                        className="px-4 py-2 text-teal-800 hover:bg-teal-50 rounded-lg transition-colors font-light"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTeamMember(tm.id)}
                        className="px-4 py-2 text-rose-800 hover:bg-rose-50 rounded-lg transition-colors font-light"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </li>
              ))}
              {teamMembers.length === 0 && (
                <li className="text-gray-600 text-center py-8 font-light">No team members yet</li>
              )}
            </ul>
          </div>

          {/* Projects Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-lg font-light text-gray-700 mb-6">Projects</h2>
            
            {/* Add Form */}
            <form onSubmit={addProject} className="mb-8">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  placeholder="Enter project name"
                  className="flex-1 px-5 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none font-light"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-colors font-light"
                >
                  Add
                </button>
              </div>
            </form>

            {/* List */}
            <ul className="space-y-3">
              {projects.map((proj) => (
                <li key={proj.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  {editingProject?.id === proj.id ? (
                    <form onSubmit={updateProject} className="flex-1 flex gap-3">
                      <input
                        type="text"
                        value={editingProject.name}
                        onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-200 outline-none font-light"
                        autoFocus
                      />
                      <button type="submit" className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 font-light">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProject(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-light"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="flex-1 text-gray-700 font-light">{proj.name}</span>
                      <button
                        onClick={() => setEditingProject(proj)}
                        className="px-4 py-2 text-teal-800 hover:bg-teal-50 rounded-lg transition-colors font-light"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteProject(proj.id)}
                        className="px-4 py-2 text-rose-800 hover:bg-rose-50 rounded-lg transition-colors font-light"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </li>
              ))}
              {projects.length === 0 && (
                <li className="text-gray-600 text-center py-8 font-light">No projects yet</li>
              )}
            </ul>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-12 flex gap-4">
          <a
            href="/submit"
            className="px-8 py-3 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-colors font-light"
          >
            Share an update
          </a>
          <a
            href="/dashboard"
            className="px-8 py-3 bg-amber-100 text-amber-900 rounded-xl hover:bg-amber-200 transition-colors border border-amber-200 font-light"
          >
            View overview
          </a>
        </div>
      </div>
    </div>
  );
}
