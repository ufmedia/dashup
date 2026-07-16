'use client';

import { useState, useEffect } from 'react';
import Logo from '@/components/Logo';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ProjectCount {
  id: number;
  name: string;
  count: number;
  member_names: string;
}

interface MemberPerProject {
  id: number;
  name: string;
  member_count: number;
  member_names: string;
}

interface Blocker {
  team_member_name: string;
  blocked_by_text: string;
}

interface ProjectOverlap {
  member1_name: string;
  member2_name: string;
  shared_projects: string;
  shared_count: number;
}

interface MemberProjectCount {
  member_name: string;
  project_count: number;
}

interface TalkToEntry {
  from_name: string;
  to_name: string;
  priority: 'red' | 'amber' | 'green';
}

interface CollaborationOpportunities {
  overlaps: ProjectOverlap[];
  memberProjectCounts: MemberProjectCount[];
}

interface DashboardData {
  projectCounts: ProjectCount[];
  membersPerProject: MemberPerProject[];
  contextSwitchMinutes: number;
  talkToList: TalkToEntry[];
  blockers: Blocker[];
  collaborationOpportunities: CollaborationOpportunities;
  timestamp: string;
}

const COLORS = [
  '#0d9488', '#e07c5f', '#d4a024', '#3b82f6', '#a855f7',
  '#14b8a6', '#f97316', '#eab308', '#6366f1', '#c084fc'
];

const POLL_INTERVAL = 5000; // 5 seconds

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchDashboardData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok && isMounted) {
          const dashboardData = await res.json();
          setData(dashboardData);
          setLastUpdate(new Date());
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
    
    // Set up polling
    const interval = setInterval(fetchDashboardData, POLL_INTERVAL);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} mins`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading your dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600 text-xl">Something went wrong loading the dashboard</div>
      </div>
    );
  }

  const pieData = data.projectCounts
    .filter(p => p.count > 0)
    .map(p => ({ name: p.name, value: p.count, memberNames: p.member_names }));

  const barData = data.membersPerProject
    .filter(p => p.member_count > 0)
    .map(p => ({ name: p.name, members: p.member_count, memberNames: p.member_names }));

  const totalContextSwitches = Math.floor(data.contextSwitchMinutes / 23);

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'red':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          fromText: 'text-red-900',
          toText: 'text-red-800',
          badge: 'bg-red-500 text-white',
          label: 'Blocking'
        };
      case 'amber':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-300',
          fromText: 'text-amber-900',
          toText: 'text-amber-800',
          badge: 'bg-amber-500 text-white',
          label: 'Soon'
        };
      default:
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-300',
          fromText: 'text-emerald-900',
          toText: 'text-emerald-800',
          badge: 'bg-emerald-500 text-white',
          label: 'When free'
        };
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-700 p-8 md:p-12 lg:p-16">
      {/* Back to Submission */}
      <div className="mb-8">
        <a
          href="/submit"
          className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-800 font-light transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Submission
        </a>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <div className="mb-4">
            <Logo />
          </div>
          <h1 className="text-3xl font-light text-gray-800 tracking-wide">Team Overview</h1>
          <p className="text-gray-600 mt-2 font-light">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-teal-800">
            <span className="inline-block w-2 h-2 bg-teal-600 rounded-full animate-pulse"></span>
            <span className="text-sm font-light">Live</span>
          </div>
          {lastUpdate && (
            <p className="text-gray-600 text-sm mt-1 font-light">
              Updated {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Context Switching Metric - Prominent Display */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-10 mb-12 text-center shadow-sm border border-amber-200">
        <h2 className="text-lg font-light text-amber-900 mb-3">
          Time we might reclaim from context switching
        </h2>
        <div className="text-5xl font-light text-amber-900">
          {formatTime(data.contextSwitchMinutes)}
        </div>
        <p className="text-amber-800 mt-4 font-light text-sm">
          Based on {totalContextSwitches} context switch{totalContextSwitches !== 1 ? 'es' : ''} at ~23 minutes each
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Pie Chart - Project Effort Distribution */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-light text-gray-700 mb-6">How effort is distributed</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                  itemStyle={{ color: '#374151' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const names = data.memberNames ? data.memberNames.split(',') : [];
                      return (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md">
                          <p className="font-medium text-gray-700 mb-1">{data.name}</p>
                          <p className="text-teal-800 text-sm">{data.value} selection{data.value !== 1 ? 's' : ''}</p>
                          {names.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              {names.map((name: string, i: number) => (
                                <p key={i} className="text-sm text-gray-600">{name.trim()}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-600 font-light">
              No project data yet
            </div>
          )}
        </div>

        {/* Bar Chart - Members per Project */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-light text-gray-700 mb-6">Team members per project</h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fill: '#4b5563', fontSize: 12 }} />
                <YAxis tick={{ fill: '#4b5563', fontSize: 12 }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                  itemStyle={{ color: '#374151' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const names = data.memberNames ? data.memberNames.split(',') : [];
                      return (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md">
                          <p className="font-medium text-gray-700 mb-1">{data.name}</p>
                          <p className="text-teal-800 text-sm">{data.members} team member{data.members !== 1 ? 's' : ''}</p>
                          {names.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              {names.map((name: string, i: number) => (
                                <p key={i} className="text-sm text-gray-600">{name.trim()}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="members" name="Team Members" radius={[6, 6, 0, 0]}>
                  {barData.map((_, index) => (
                    <Cell key={`bar-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-600 font-light">
              No team member data yet
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Who Needs to Talk to Who */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-light text-gray-600 mb-6">
            Requested conversations
          </h2>
          {data.talkToList.length > 0 ? (
            <ul className="space-y-3">
              {data.talkToList.map((entry, index) => {
                const styles = getPriorityStyles(entry.priority);
                return (
                  <li key={index} className={`flex items-center justify-between p-4 ${styles.bg} rounded-xl border ${styles.border}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${styles.fromText}`}>{entry.from_name}</span>
                      <span className="text-gray-600 font-light">wants to chat with</span>
                      <span className={`font-medium ${styles.toText}`}>{entry.to_name}</span>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${styles.badge}`}>
                      {styles.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-gray-600 text-center py-10 font-light">
              No requested conversations right now
            </div>
          )}
        </div>

        {/* Current Blockers */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-light text-gray-700 mb-6">
            What might be slowing us down
          </h2>
          {data.blockers.length > 0 ? (
            <ul className="space-y-4">
              {data.blockers.map((blocker, index) => (
                <li key={index} className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="font-medium text-rose-900 mb-1">{blocker.team_member_name}</div>
                  <div className="text-gray-700 font-light">{blocker.blocked_by_text}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-600 text-center py-10 font-light">
              Looking clear today
            </div>
          )}
        </div>
      </div>

      {/* Collaboration Opportunities - Focus Time Optimizations */}
      {(data.collaborationOpportunities.overlaps.length > 0 || 
        data.collaborationOpportunities.memberProjectCounts.length > 0) && (
        <div className="mt-10 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-3xl p-8">
          <h2 className="text-lg font-light text-teal-900 mb-3">
            Possible Opportunities
          </h2>
          <p className="text-gray-600 text-sm mb-6 font-light">
            These team members share multiple projects and might find it helpful to coordinate.
          </p>
          
          {data.collaborationOpportunities.overlaps.length > 0 && (
            <div className="mb-8">
              <h3 className="text-base font-light text-teal-800 mb-4">Potential collaborations</h3>
              <div className="grid gap-4">
                {data.collaborationOpportunities.overlaps.map((overlap, index) => {
                  const potentialTimeSaved = (overlap.shared_count - 1) * 23;
                  return (
                    <div key={index} className="bg-white rounded-xl p-5 border border-teal-200 shadow-sm">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-teal-900">{overlap.member1_name}</span>
                          <span className="text-gray-600">&</span>
                          <span className="font-medium text-teal-800">{overlap.member2_name}</span>
                        </div>
                        <span className="text-xs bg-teal-100 text-teal-900 px-3 py-1 rounded-full font-light">
                          {overlap.shared_count} shared projects
                        </span>
                      </div>
                      <div className="mt-3 text-sm text-gray-600 font-light">
                        Both working on: <span className="text-gray-800">{overlap.shared_projects}</span>
                      </div>
                      <div className="mt-2 text-sm text-amber-900 font-light">
                        Could potentially save ~{potentialTimeSaved} mins by coordinating
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.collaborationOpportunities.memberProjectCounts.length > 0 && (
            <div>
              <h3 className="text-base font-light text-teal-800 mb-4">Juggling multiple projects</h3>
              <div className="flex flex-wrap gap-3">
                {data.collaborationOpportunities.memberProjectCounts.map((member, index) => (
                  <div key={index} className="bg-white rounded-xl px-5 py-3 border border-amber-200 shadow-sm">
                    <span className="font-medium text-amber-900">{member.member_name}</span>
                    <span className="text-gray-600 ml-2 font-light">
                      {member.project_count} projects
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
          <div className="text-3xl font-light text-teal-800">
            {data.projectCounts.reduce((sum, p) => sum + p.count, 0)}
          </div>
          <div className="text-gray-600 mt-2 text-sm font-light">Total Selections</div>
        </div>
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
          <div className="text-3xl font-light text-teal-800">
            {new Set(data.membersPerProject.filter(p => p.member_count > 0).flatMap(p => p.name)).size > 0
              ? data.membersPerProject.filter(p => p.member_count > 0).length
              : 0}
          </div>
          <div className="text-gray-600 mt-2 text-sm font-light">Active Projects</div>
        </div>
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
          <div className="text-3xl font-light text-amber-800">
            {data.talkToList.length}
          </div>
          <div className="text-gray-600 mt-2 text-sm font-light">Sync Requests</div>
        </div>
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
          <div className="text-3xl font-light text-rose-800">
            {data.blockers.length}
          </div>
          <div className="text-gray-600 mt-2 text-sm font-light">Blockers</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-12 flex justify-center gap-4">
        
      </div>
    </div>
  );
}
