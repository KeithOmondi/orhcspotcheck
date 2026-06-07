// src/pages/admin/AdminDashboard.tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchUsers } from '../../store/slices/userSlice';
import { fetchTeams } from '../../store/slices/teamSlice';
import { fetchSubmissions } from '../../store/slices/submissionSlice';
import { fetchAssignments } from '../../store/slices/assignmentSlice';
import { fetchComponents } from '../../store/slices/componentSlice';
import {
  Users, Users2, ClipboardList, FileCheck2,
  TrendingUp, Clock, CheckCircle2, 
  LayoutDashboard
} from 'lucide-react';

const AdminDashboard = () => {
  const dispatch = useAppDispatch();

  // Fetch data on mount
  useEffect(() => {
    dispatch(fetchUsers({}));
    dispatch(fetchTeams());
    dispatch(fetchSubmissions({}));
    dispatch(fetchAssignments({}));
    dispatch(fetchComponents({}));
  }, [dispatch]);

  // Selectors
  const { users, isLoading: usersLoading } = useAppSelector((s) => s.user);
  const { teams, isLoading: teamsLoading } = useAppSelector((s) => s.team);
  const { submissions, isLoading: submissionsLoading } = useAppSelector((s) => s.submission);
  const { assignments, isLoading: assignmentsLoading } = useAppSelector((s) => s.assignment);
  const { components, isLoading: componentsLoading } = useAppSelector((s) => s.component);

  const isLoading = usersLoading || teamsLoading || submissionsLoading || assignmentsLoading || componentsLoading;

  // Calculate stats
  const totalUsers = users.length;
  const totalTeams = teams.length;
  const totalSubmissions = submissions.length;
  const totalAssignments = assignments.length;
  const totalComponents = components.length;
  const completionRate = totalComponents > 0
    ? Math.round((totalAssignments / totalComponents) * 100)
    : 0;

  // Dummy recent activity (in a real app you'd fetch from an activity log)
  const recentActivities = [
    { id: 1, action: 'New submission', user: 'Inspector A', time: '2 hours ago', icon: FileCheck2 },
    { id: 2, action: 'Team created', user: 'Admin', time: 'Yesterday', icon: Users2 },
    { id: 3, action: 'Assignment updated', user: 'Manager', time: '2 days ago', icon: ClipboardList },
  ];

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: Users,
      change: '+12%',
      color: '#c9a84c',
      bg: 'rgba(201,168,76,0.1)',
    },
    {
      title: 'Teams',
      value: totalTeams,
      icon: Users2,
      change: '+3',
      color: '#2d6a4f',
      bg: 'rgba(45,106,79,0.1)',
    },
    {
      title: 'Submissions',
      value: totalSubmissions,
      icon: FileCheck2,
      change: '+8%',
      color: '#10b981',
      bg: 'rgba(16,185,129,0.1)',
    },
    {
      title: 'Assignments',
      value: totalAssignments,
      icon: ClipboardList,
      change: `${completionRate}%`,
      color: '#c9a84c',
      bg: 'rgba(201,168,76,0.1)',
    },
  ];

  return (
    <div className="w-full p-4 sm:p-6" style={{ background: '#fdf8f0' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <LayoutDashboard size={20} style={{ color: '#c9a84c' }} />
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#1a3d1c' }}>
            Dashboard
          </h1>
        </div>
        <p className="text-xs sm:text-sm" style={{ color: '#6b7280' }}>
          Welcome back, Admin. Here's what's happening with your inspections today.
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: '#c9a84c' }} />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Stats Cards – responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="rounded-xl p-4 transition-all hover:shadow-md"
                  style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: stat.bg }}>
                      <Icon size={18} style={{ color: stat.color }} />
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: stat.bg, color: stat.color }}>
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: '#1a3d1c' }}>{stat.value}</p>
                  <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{stat.title}</p>
                </div>
              );
            })}
          </div>

          {/* Two‑column layout for recent activity & quick actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}>
              <div className="px-4 py-3 border-b" style={{ background: '#1a3d1c', borderColor: '#2c5f2e' }}>
                <div className="flex items-center gap-2">
                  <Clock size={14} style={{ color: '#c9a84c' }} />
                  <h3 className="text-sm font-semibold" style={{ color: '#fdf8f0' }}>Recent Activity</h3>
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: '#f0e8d6' }}>
                {recentActivities.map((act) => {
                  const ActIcon = act.icon;
                  return (
                    <div key={act.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f0f9f5] transition-colors">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,168,76,0.1)' }}>
                        <ActIcon size={14} style={{ color: '#c9a84c' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#1a3d1c' }}>{act.action}</p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>{act.user} · {act.time}</p>
                      </div>
                      <ChevronRight size={14} style={{ color: '#a8c5a0' }} />
                    </div>
                  );
                })}
                {recentActivities.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm" style={{ color: '#a8c5a0' }}>
                    No recent activity.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}>
              <div className="px-4 py-3 border-b" style={{ background: '#1a3d1c', borderColor: '#2c5f2e' }}>
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} style={{ color: '#c9a84c' }} />
                  <h3 className="text-sm font-semibold" style={{ color: '#fdf8f0' }}>Quick Actions</h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <a
                  href="/admin/users"
                  className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-[#f0f9f5]"
                  style={{ border: '1px solid #d6c9a8' }}
                >
                  <div className="flex items-center gap-3">
                    <Users size={16} style={{ color: '#c9a84c' }} />
                    <span className="text-sm font-medium" style={{ color: '#1a3d1c' }}>Manage Users</span>
                  </div>
                  <ChevronRight size={14} style={{ color: '#a8c5a0' }} />
                </a>
                <a
                  href="/admin/teams"
                  className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-[#f0f9f5]"
                  style={{ border: '1px solid #d6c9a8' }}
                >
                  <div className="flex items-center gap-3">
                    <Users2 size={16} style={{ color: '#c9a84c' }} />
                    <span className="text-sm font-medium" style={{ color: '#1a3d1c' }}>Organize Teams</span>
                  </div>
                  <ChevronRight size={14} style={{ color: '#a8c5a0' }} />
                </a>
                <a
                  href="/admin/assignments"
                  className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-[#f0f9f5]"
                  style={{ border: '1px solid #d6c9a8' }}
                >
                  <div className="flex items-center gap-3">
                    <ClipboardList size={16} style={{ color: '#c9a84c' }} />
                    <span className="text-sm font-medium" style={{ color: '#1a3d1c' }}>Review Assignments</span>
                  </div>
                  <ChevronRight size={14} style={{ color: '#a8c5a0' }} />
                </a>
                <a
                  href="/admin/submissions"
                  className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-[#f0f9f5]"
                  style={{ border: '1px solid #d6c9a8' }}
                >
                  <div className="flex items-center gap-3">
                    <FileCheck2 size={16} style={{ color: '#c9a84c' }} />
                    <span className="text-sm font-medium" style={{ color: '#1a3d1c' }}>View Submissions</span>
                  </div>
                  <ChevronRight size={14} style={{ color: '#a8c5a0' }} />
                </a>
              </div>
            </div>
          </div>

          {/* Additional insight card (optional) */}
          <div className="mt-6 rounded-xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}>
            <div className="px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ background: '#1a3d1c', borderColor: '#2c5f2e' }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} style={{ color: '#c9a84c' }} />
                <h3 className="text-sm font-semibold" style={{ color: '#fdf8f0' }}>Inspection Progress</h3>
              </div>
              <span className="text-xs" style={{ color: '#a8c5a0' }}>
                {totalAssignments} of {totalComponents} sections assigned ({completionRate}%)
              </span>
            </div>
            <div className="p-4">
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#f0e8d6' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%`, background: '#1a3d1c' }}
                />
              </div>
              <p className="text-xs mt-3 text-center" style={{ color: '#6b7280' }}>
                {completionRate === 100
                  ? 'All inspection sections have been assigned!'
                  : `${totalComponents - totalAssignments} section${totalComponents - totalAssignments !== 1 ? 's' : ''} still need assignment.`}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Helper component for the chevron icon (import if needed)
const ChevronRight = ({ size, style }: { size: number; style: React.CSSProperties }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export default AdminDashboard;