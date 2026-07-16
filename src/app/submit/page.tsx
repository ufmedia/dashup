'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

interface TeamMember {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
}

interface TalkToRequest {
  memberId: number;
  priority: 'red' | 'amber' | 'green';
}

interface ExistingSubmission {
  id: number;
  blocked_by_text: string | null;
  projects: { id: number; name: string }[];
  talkTo: { id: number; name: string; priority: string }[];
}

export default function SubmitPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [blockedBy, setBlockedBy] = useState('');
  const [talkToRequests, setTalkToRequests] = useState<TalkToRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingSubmissionId, setExistingSubmissionId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [talkToDropdownOpen, setTalkToDropdownOpen] = useState(false);
  
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const talkToDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for user in localStorage
    const storedUserId = localStorage.getItem('dashup_user_id');
    const storedUserName = localStorage.getItem('dashup_user_name');
    const storedDate = localStorage.getItem('dashup_session_date');
    const today = new Date().toISOString().split('T')[0];

    // If no user or day rolled over, redirect to home
    if (!storedUserId || !storedUserName || storedDate !== today) {
      localStorage.removeItem('dashup_user_id');
      localStorage.removeItem('dashup_user_name');
      localStorage.removeItem('dashup_session_date');
      router.push('/');
      return;
    }

    setCurrentUser({ id: parseInt(storedUserId), name: storedUserName });

    // Fetch data
    const fetchData = async () => {
      try {
        const [tmRes, projRes, submissionRes] = await Promise.all([
          fetch('/api/team-members'),
          fetch('/api/projects'),
          fetch(`/api/submissions/mine?teamMemberId=${storedUserId}`)
        ]);
        
        if (tmRes.ok) setTeamMembers(await tmRes.json());
        if (projRes.ok) setProjects(await projRes.json());
        
        if (submissionRes.ok) {
          const { submission } = await submissionRes.json();
          if (submission) {
            // Load existing submission for editing
            setExistingSubmissionId(submission.id);
            setIsEditing(true);
            setSelectedProjects(submission.projects.map((p: { id: number }) => p.id));
            setBlockedBy(submission.blocked_by_text || '');
            setTalkToRequests(submission.talkTo.map((t: { id: number; priority: string }) => ({
              memberId: t.id,
              priority: t.priority as 'red' | 'amber' | 'green'
            })));
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
      if (talkToDropdownRef.current && !talkToDropdownRef.current.contains(event.target as Node)) {
        setTalkToDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleProject = (projectId: number) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const toggleTalkTo = (memberId: number) => {
    setTalkToRequests(prev => {
      const exists = prev.find(r => r.memberId === memberId);
      if (exists) {
        return prev.filter(r => r.memberId !== memberId);
      }
      return [...prev, { memberId, priority: 'green' as const }];
    });
  };

  const updateTalkToPriority = (memberId: number, priority: 'red' | 'amber' | 'green') => {
    setTalkToRequests(prev => 
      prev.map(r => r.memberId === memberId ? { ...r, priority } : r)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setMessage({ type: 'error', text: 'No user selected' });
      return;
    }
    
    if (selectedProjects.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one project' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      let res;
      
      if (existingSubmissionId) {
        // Update existing submission
        res = await fetch('/api/submissions/mine', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId: existingSubmissionId,
            projectIds: selectedProjects,
            blockedByText: blockedBy.trim() || null,
            talkToRequests
          })
        });
      } else {
        // Create new submission
        res = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamMemberId: currentUser.id,
            projectIds: selectedProjects,
            blockedByText: blockedBy.trim() || null,
            talkToRequests
          })
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (!existingSubmissionId && data.id) {
          setExistingSubmissionId(data.id);
          setIsEditing(true);
        }
        // Redirect to dashboard after successful submission
        router.push('/dashboard');
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedProjectNames = () => {
    return projects
      .filter(p => selectedProjects.includes(p.id))
      .map(p => p.name)
      .join(', ');
  };

  const getSelectedTalkToNames = () => {
    return teamMembers
      .filter(tm => talkToRequests.some(r => r.memberId === tm.id))
      .map(tm => tm.name)
      .join(', ');
  };

  const switchUser = () => {
    localStorage.removeItem('dashup_user_id');
    localStorage.removeItem('dashup_user_name');
    localStorage.removeItem('dashup_session_date');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600 text-xl font-light">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4 md:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="mb-6">
            <Logo className="mx-auto" />
          </div>
          <p className="text-gray-500 font-light mb-4">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <h1 className="text-3xl font-light text-gray-800 tracking-wide">
            {isEditing ? 'Edit your update' : 'Share your update'}
          </h1>
          <p className="text-gray-600 mt-3 font-light">
            Hi {currentUser.name}! {isEditing ? 'Your update for today:' : 'What are you working on today?'}
          </p>
          <button
            onClick={switchUser}
            className="text-sm text-gray-500 hover:text-gray-700 mt-2 font-light"
          >
            Not you? Switch user
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-8 p-5 rounded-xl font-light ${
              message.type === 'success'
                ? 'bg-teal-50 border border-teal-200 text-teal-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-10 space-y-8">
          {/* Question 1: What are you working on? */}
          <div ref={projectDropdownRef}>
            <label className="block text-sm font-light text-gray-500 mb-3">
              What are you working on today?
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none bg-white text-left flex justify-between items-center"
              >
                <span className={`font-light ${selectedProjects.length > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                  {selectedProjects.length > 0
                    ? getSelectedProjectNames()
                    : 'Select projects...'}
                </span>
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {projectDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                  {projects.length === 0 ? (
                    <div className="px-5 py-4 text-gray-600 font-light">No projects available</div>
                  ) : (
                    projects.map((proj) => (
                      <label
                        key={proj.id}
                        className="flex items-center px-5 py-4 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(proj.id)}
                          onChange={() => toggleProject(proj.id)}
                          className="w-4 h-4 text-teal-700 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <span className="ml-3 text-gray-700 font-light">{proj.name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedProjects.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {projects
                  .filter(p => selectedProjects.includes(p.id))
                  .map(proj => (
                    <span
                      key={proj.id}
                      className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-teal-50 text-teal-900 font-light border border-teal-200"
                    >
                      {proj.name}
                      <button
                        type="button"
                        onClick={() => toggleProject(proj.id)}
                        className="ml-2 text-teal-700 hover:text-teal-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Question 2: What are you blocked by? */}
          <div>
            <label className="block text-sm font-light text-gray-500 mb-3">
              Anything slowing you down?
            </label>
            <textarea
              value={blockedBy}
              onChange={(e) => setBlockedBy(e.target.value)}
              placeholder="Share any blockers, or leave empty if things are flowing well..."
              rows={3}
              className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none resize-none font-light text-gray-700 placeholder-gray-400"
            />
          </div>

          {/* Question 3: Who do you need to talk to? */}
          <div ref={talkToDropdownRef}>
            <label className="block text-sm font-light text-gray-500 mb-3">
              Anyone you&apos;d like to catch up with?
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setTalkToDropdownOpen(!talkToDropdownOpen)}
                className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none bg-white text-left flex justify-between items-center"
              >
                <span className={`font-light ${talkToRequests.length > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                  {talkToRequests.length > 0
                    ? getSelectedTalkToNames()
                    : 'Select team members...'}
                </span>
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {talkToDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                  {teamMembers.length === 0 ? (
                    <div className="px-5 py-4 text-gray-600 font-light">No team members available</div>
                  ) : (
                    teamMembers
                      .filter(tm => tm.id !== currentUser.id)
                      .map((tm) => (
                        <label
                          key={tm.id}
                          className="flex items-center px-5 py-4 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={talkToRequests.some(r => r.memberId === tm.id)}
                            onChange={() => toggleTalkTo(tm.id)}
                            className="w-4 h-4 text-teal-700 rounded border-gray-300 focus:ring-teal-500"
                          />
                          <span className="ml-3 text-gray-700 font-light">{tm.name}</span>
                        </label>
                      ))
                  )}
                </div>
              )}
            </div>
            {talkToRequests.length > 0 && (
              <div className="mt-4 space-y-3">
                {talkToRequests.map(request => {
                  const member = teamMembers.find(tm => tm.id === request.memberId);
                  if (!member) return null;
                  return (
                    <div key={request.memberId} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-700">{member.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleTalkTo(request.memberId)}
                          className="text-gray-400 hover:text-gray-600 text-sm"
                        >
                          remove
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 mr-2 font-light">Priority:</span>
                        <button
                          type="button"
                          onClick={() => updateTalkToPriority(request.memberId, 'green')}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            request.priority === 'green'
                              ? 'bg-emerald-500 border-emerald-600 ring-2 ring-emerald-200'
                              : 'bg-emerald-100 border-emerald-300 hover:bg-emerald-200'
                          }`}
                          title="Low - when convenient"
                        />
                        <button
                          type="button"
                          onClick={() => updateTalkToPriority(request.memberId, 'amber')}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            request.priority === 'amber'
                              ? 'bg-amber-500 border-amber-600 ring-2 ring-amber-200'
                              : 'bg-amber-100 border-amber-300 hover:bg-amber-200'
                          }`}
                          title="Medium - soon"
                        />
                        <button
                          type="button"
                          onClick={() => updateTalkToPriority(request.memberId, 'red')}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            request.priority === 'red'
                              ? 'bg-red-500 border-red-600 ring-2 ring-red-200'
                              : 'bg-red-100 border-red-300 hover:bg-red-200'
                          }`}
                          title="High - blocking"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl font-light text-white transition-all ${
              isSubmitting
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-teal-700 hover:bg-teal-800 active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Save changes' : 'Share update')}
          </button>
        </form>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a href="/dashboard" className="text-teal-800 hover:text-teal-900 font-light">
            View team overview →
          </a>
        </div>
      </div>
    </div>
  );
}
