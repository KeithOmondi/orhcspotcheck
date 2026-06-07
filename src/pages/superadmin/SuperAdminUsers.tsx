// src/pages/SuperAdminUsers.tsx
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchUsers,
  createUser,
  deleteUser,
  resetUserSuccess,
  clearUserError,
  type User,
} from '../../store/slices/userSlice';
import {
  fetchTeams,
  createTeam,
  addTeamMember,
  removeTeamMember,
  resetTeamSuccess,
  clearTeamError,
  type Team,
} from '../../store/slices/teamSlice';
import {
  fetchStations,
} from '../../store/slices/stationSlice';
import toast from 'react-hot-toast';
import { Plus, Trash2, UserPlus, X, Building2, Loader2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewUserForm {
  email:      string;
  full_name:  string;
  role:       'user' | 'admin' | 'super_admin';
  pj_number:  string;
  station_ids: number[];   // for admin users – one or more stations
}

interface NewTeamForm {
  name:       string;
  station_id: string;
}

const EMPTY_USER: NewUserForm = {
  email: '',
  full_name: '',
  role: 'user',
  pj_number: '',
  station_ids: [],
};
const EMPTY_TEAM: NewTeamForm = { name: '', station_id: '' };

// ─── Component ────────────────────────────────────────────────────────────────

const SuperAdminUsers = () => {
  const dispatch = useAppDispatch();

  const { users, isLoading: usersLoading, error: userError, actionSuccess: userSuccess } =
    useAppSelector((s) => s.user);
  const { teams, isLoading: teamsLoading, error: teamError, actionSuccess: teamSuccess } =
    useAppSelector((s) => s.team);
  const { stations, isLoading: stationsLoading } = useAppSelector((s) => s.station);

  const isLoading = usersLoading || teamsLoading || stationsLoading;

  const [newUser, setNewUser]               = useState<NewUserForm>(EMPTY_USER);
  const [newTeam, setNewTeam]               = useState<NewTeamForm>(EMPTY_TEAM);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [isTeamLead, setIsTeamLead]         = useState(false);

  // ── Fetch on mount ───────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(resetUserSuccess());
    dispatch(resetTeamSuccess());
    dispatch(fetchUsers());
    dispatch(fetchTeams());
    dispatch(fetchStations());
  }, [dispatch]);

  // ── User action success ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!userSuccess) return;
    toast.success('User operation completed!');
    dispatch(resetUserSuccess());
    dispatch(fetchUsers());
  }, [userSuccess, dispatch]);

  // ── Team action success ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!teamSuccess) return;
    toast.success('Team operation completed!');
    dispatch(resetTeamSuccess());
    dispatch(fetchTeams());
  }, [teamSuccess, dispatch]);

  // ── Error toasts ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userError) return;
    toast.error(userError);
    dispatch(clearUserError());
  }, [userError, dispatch]);

  useEffect(() => {
    if (!teamError) return;
    toast.error(teamError);
    dispatch(clearTeamError());
  }, [teamError, dispatch]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email.trim() || !newUser.full_name.trim() || !newUser.pj_number.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (newUser.role === 'admin' && newUser.station_ids.length === 0) {
      toast.error('Please select at least one station for this admin.');
      return;
    }

    const payload: {
      email: string;
      full_name: string;
      role: 'user' | 'admin' | 'super_admin';
      pj_number: string;
      station_ids?: number[];
    } = {
      email: newUser.email,
      full_name: newUser.full_name,
      role: newUser.role,
      pj_number: newUser.pj_number,
    };

    if (newUser.role === 'admin') {
      payload.station_ids = newUser.station_ids;
    }

    await dispatch(createUser(payload));
    setNewUser(EMPTY_USER);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.name.trim()) {
      toast.error('Team name is required.');
      return;
    }
    await dispatch(createTeam({
      name:       newTeam.name,
      station_id: newTeam.station_id ? Number(newTeam.station_id) : null,
    }));
    setNewTeam(EMPTY_TEAM);
  };

  const handleAddMember = async () => {
    if (selectedTeamId === '' || selectedUserId === '') {
      toast.error('Please select both a team and a user.');
      return;
    }
    await dispatch(addTeamMember({
      team_id:      selectedTeamId as number,
      user_id:      selectedUserId as number,
      is_team_lead: isTeamLead,
    }));
    setSelectedTeamId('');
    setSelectedUserId('');
    setIsTeamLead(false);
  };

  const handleRemoveMember = (teamId: number, userId: number) => {
    dispatch(removeTeamMember({ team_id: teamId, user_id: userId }));
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Delete ${user.full_name}? This cannot be undone.`)) return;
    await dispatch(deleteUser(user.id));
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getTeamLead = (team: Team) =>
    team.members?.find((m) => m.is_team_lead)?.full_name ?? 'None';

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-700';
      case 'admin':       return 'bg-[#c9a84c]/20 text-[#c9a84c]';
      default:            return 'bg-[#a8c5a0]/20 text-[#2d6a4f]';
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading && !users.length && !teams.length) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#c9a84c' }} />
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6" style={{ background: '#fdf8f0' }}>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: '#1a3d1c' }}>User & Team Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Users ── */}
        <div className="space-y-6">

          {/* Create User */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}>
            <div className="px-5 py-4 border-b" style={{ background: '#1a3d1c', borderColor: '#2c5f2e' }}>
              <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#fdf8f0' }}>
                <Plus size={18} style={{ color: '#c9a84c' }} />
                Create New User
              </h2>
            </div>
            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <input
                type="text"
                placeholder="Full Name *"
                value={newUser.full_name}
                onChange={(e) => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
              />
              <input
                type="email"
                placeholder="Email *"
                value={newUser.email}
                onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
              />
              <input
                type="text"
                placeholder="PJ Number *"
                value={newUser.pj_number}
                onChange={(e) => setNewUser(p => ({ ...p, pj_number: e.target.value }))}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
              />
              <select
                value={newUser.role}
                onChange={(e) => {
                  const role = e.target.value as NewUserForm['role'];
                  setNewUser(p => ({ ...p, role, station_ids: role === 'admin' ? p.station_ids : [] }));
                }}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>

              {/* Station selection – only for admins */}
              {newUser.role === 'admin' && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#1a3d1c' }}>
                    Assign to Station(s) *
                  </label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8c5a0' }} />
                    {stationsLoading ? (
                      <div className="w-full pl-9 pr-3 py-2 rounded-md text-sm border border-[#d6c9a8] bg-white flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" style={{ color: '#c9a84c' }} />
                        <span style={{ color: '#6b7280' }}>Loading stations...</span>
                      </div>
                    ) : stations.length === 0 ? (
                      <div className="w-full pl-9 pr-3 py-2 rounded-md text-sm border border-[#d6c9a8] bg-white text-red-500">
                        No stations found. Please create stations first.
                      </div>
                    ) : (
                      <select
                        multiple
                        value={newUser.station_ids.map(String)}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, (opt) => Number(opt.value));
                          setNewUser(p => ({ ...p, station_ids: selected }));
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors min-h-[100px]"
                        style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
                      >
                        {stations.map((station) => (
                          <option key={station.id} value={station.id}>
                            {station.name} ({station.code})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {stations.length > 0 && (
                    <p className="text-[10px] mt-1" style={{ color: '#a8c5a0' }}>
                      Hold Ctrl (Cmd on Mac) to select multiple stations.
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={usersLoading}
                className="w-full px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#1a3d1c', color: '#fdf8f0' }}
                onMouseEnter={(e) => { if (!usersLoading) e.currentTarget.style.background = '#2d6a4f'; }}
                onMouseLeave={(e) => { if (!usersLoading) e.currentTarget.style.background = '#1a3d1c'; }}
              >
                Create User
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}>
            <div className="px-5 py-4 border-b" style={{ background: '#1a3d1c', borderColor: '#2c5f2e' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#fdf8f0' }}>
                All Users <span style={{ color: '#a8c5a0' }}>({users.length})</span>
              </h2>
            </div>
            <div className="max-h-96 overflow-y-auto p-4 space-y-3">
              {users.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: '#a8c5a0' }}>No users yet.</p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: '#fdf8f0', border: '1px solid #f0e8d6' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate" style={{ color: '#1a3d1c' }}>{user.full_name}</p>
                      <p className="text-xs truncate" style={{ color: '#6b7280' }}>{user.email}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                        {user.pj_number && (
                          <span className="text-xs" style={{ color: '#a8c5a0' }}>PJ: {user.pj_number}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="ml-3 p-1.5 rounded transition-colors shrink-0"
                      style={{ color: '#c0392b' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#922b21')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#c0392b')}
                      title="Delete user"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Teams ── */}
        <div className="space-y-6">

          {/* Create Team */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}>
            <div className="px-5 py-4 border-b" style={{ background: '#1a3d1c', borderColor: '#2c5f2e' }}>
              <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#fdf8f0' }}>
                <Plus size={18} style={{ color: '#c9a84c' }} />
                Create New Team
              </h2>
            </div>
            <form onSubmit={handleCreateTeam} className="p-5 space-y-4">
              <input
                type="text"
                placeholder="Team Name *"
                value={newTeam.name}
                onChange={(e) => setNewTeam(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
              />
              <input
                type="number"
                placeholder="Station ID (optional)"
                value={newTeam.station_id}
                onChange={(e) => setNewTeam(p => ({ ...p, station_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
              />
              <button
                type="submit"
                disabled={teamsLoading}
                className="w-full px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#1a3d1c', color: '#fdf8f0' }}
                onMouseEnter={(e) => { if (!teamsLoading) e.currentTarget.style.background = '#2d6a4f'; }}
                onMouseLeave={(e) => { if (!teamsLoading) e.currentTarget.style.background = '#1a3d1c'; }}
              >
                Create Team
              </button>
            </form>
          </div>

          {/* Add Member to Team */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}>
            <div className="px-5 py-4 border-b" style={{ background: '#1a3d1c', borderColor: '#2c5f2e' }}>
              <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#fdf8f0' }}>
                <UserPlus size={18} style={{ color: '#c9a84c' }} />
                Add Member to Team
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
              >
                <option value="">-- Select a team --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
              >
                <option value="">-- Select a user --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} — {u.pj_number ?? u.email}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: '#1a3d1c' }}>
                <input
                  type="checkbox"
                  checked={isTeamLead}
                  onChange={(e) => setIsTeamLead(e.target.checked)}
                  className="rounded focus:ring-2"
                  style={{ borderColor: '#d6c9a8', accentColor: '#c9a84c' }}
                />
                Set as Team Lead
              </label>
              <button
                onClick={handleAddMember}
                disabled={selectedTeamId === '' || selectedUserId === ''}
                className="w-full px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#1a3d1c', color: '#fdf8f0' }}
                onMouseEnter={(e) => { if (selectedTeamId !== '' && selectedUserId !== '') e.currentTarget.style.background = '#2d6a4f'; }}
                onMouseLeave={(e) => { if (selectedTeamId !== '' && selectedUserId !== '') e.currentTarget.style.background = '#1a3d1c'; }}
              >
                Add to Team
              </button>
            </div>
          </div>

          {/* Teams List */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}>
            <div className="px-5 py-4 border-b" style={{ background: '#1a3d1c', borderColor: '#2c5f2e' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#fdf8f0' }}>
                All Teams <span style={{ color: '#a8c5a0' }}>({teams.length})</span>
              </h2>
            </div>
            <div className="max-h-96 overflow-y-auto p-4 space-y-3">
              {teams.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: '#a8c5a0' }}>No teams yet.</p>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className="rounded-lg p-3"
                    style={{ background: '#fdf8f0', border: '1px solid #f0e8d6' }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
                      <p className="font-medium text-sm" style={{ color: '#1a3d1c' }}>{team.name}</p>
                      <span className="text-xs" style={{ color: '#a8c5a0' }}>
                        Lead: {getTeamLead(team)}
                      </span>
                    </div>
                    {team.members?.length ? (
                      <div className="space-y-1">
                        {team.members.map((member) => (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between p-2 rounded text-xs"
                            style={{ background: '#fff', border: '1px solid #d6c9a8' }}
                          >
                            <span style={{ color: '#1c1c1c' }}>
                              {member.full_name}
                              {member.is_team_lead && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: '#c9a84c/20', color: '#c9a84c' }}>
                                  Lead
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => handleRemoveMember(team.id, member.user_id)}
                              className="p-0.5 rounded transition-colors"
                              style={{ color: '#c0392b' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#922b21')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#c0392b')}
                              title="Remove member"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-center py-2" style={{ color: '#a8c5a0' }}>No members assigned.</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUsers;