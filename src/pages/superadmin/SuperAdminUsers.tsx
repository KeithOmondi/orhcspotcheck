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
import toast from 'react-hot-toast';
import { Plus, Trash2, UserPlus, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewUserForm {
  email:     string;
  full_name: string;
  role:      'user' | 'admin' | 'super_admin';
  pj_number: string;
}

interface NewTeamForm {
  name:       string;
  station_id: string;
}

const EMPTY_USER: NewUserForm = { email: '', full_name: '', role: 'user', pj_number: '' };
const EMPTY_TEAM: NewTeamForm = { name: '', station_id: '' };

// ─── Component ────────────────────────────────────────────────────────────────

const SuperAdminUsers = () => {
  const dispatch = useAppDispatch();

  const { users, isLoading: usersLoading, error: userError, actionSuccess: userSuccess } =
    useAppSelector((s) => s.user);
  const { teams, isLoading: teamsLoading, error: teamError, actionSuccess: teamSuccess } =
    useAppSelector((s) => s.team);

  const isLoading = usersLoading || teamsLoading;

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
    await dispatch(createUser(newUser));
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
      case 'admin':       return 'bg-yellow-100 text-yellow-700';
      default:            return 'bg-gray-100 text-gray-600';
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading && !users.length && !teams.length) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">User & Team Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── LEFT: Users ── */}
        <div className="space-y-6">

          {/* Create User */}
          <div className="border border-gray-200 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-blue-500" />
              Create New User
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <input
                type="text"
                placeholder="Full Name *"
                value={newUser.full_name}
                onChange={(e) => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Email *"
                value={newUser.email}
                onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="PJ Number *"
                value={newUser.pj_number}
                onChange={(e) => setNewUser(p => ({ ...p, pj_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser(p => ({ ...p, role: e.target.value as NewUserForm['role'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <button
                type="submit"
                disabled={usersLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create User
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="border border-gray-200 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              All Users <span className="text-gray-400 font-normal">({users.length})</span>
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No users yet.</p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                        {user.pj_number && (
                          <span className="text-xs text-gray-400">PJ: {user.pj_number}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="ml-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
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
          <div className="border border-gray-200 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-blue-500" />
              Create New Team
            </h2>
            <form onSubmit={handleCreateTeam} className="space-y-3">
              <input
                type="text"
                placeholder="Team Name *"
                value={newTeam.name}
                onChange={(e) => setNewTeam(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Station ID (optional)"
                value={newTeam.station_id}
                onChange={(e) => setNewTeam(p => ({ ...p, station_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={teamsLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Team
              </button>
            </form>
          </div>

          {/* Add Member to Team */}
          <div className="border border-gray-200 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-blue-500" />
              Add Member to Team
            </h2>
            <div className="space-y-3">
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a team --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a user --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} — {u.pj_number ?? u.email}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isTeamLead}
                  onChange={(e) => setIsTeamLead(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Set as Team Lead
              </label>
              <button
                onClick={handleAddMember}
                disabled={selectedTeamId === '' || selectedUserId === ''}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Team
              </button>
            </div>
          </div>

          {/* Teams List */}
          <div className="border border-gray-200 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              All Teams <span className="text-gray-400 font-normal">({teams.length})</span>
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {teams.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No teams yet.</p>
              ) : (
                teams.map((team) => (
                  <div key={team.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 text-sm">{team.name}</p>
                      <span className="text-xs text-gray-400">
                        Lead: {getTeamLead(team)}
                      </span>
                    </div>
                    {team.members?.length ? (
                      <div className="space-y-1">
                        {team.members.map((member) => (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs"
                          >
                            <span className="text-gray-700">
                              {member.full_name}
                              {member.is_team_lead && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px]">
                                  Lead
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => handleRemoveMember(team.id, member.user_id)}
                              className="p-0.5 text-gray-400 hover:text-red-600 transition-colors"
                              title="Remove member"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No members assigned.</p>
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