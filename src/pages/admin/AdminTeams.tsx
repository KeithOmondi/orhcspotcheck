// src/pages/admin/AdminTeams.tsx
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchTeams,
  createTeam,
  addTeamMember,
  removeTeamMember,
  resetTeamSuccess,
  type Team,
} from '../../store/slices/teamSlice';
import { fetchUsers, type User } from '../../store/slices/userSlice';
import { Plus, Users, Trash2, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminTeams = () => {
  const dispatch = useAppDispatch();

  const { teams, isLoading: teamsLoading, error: teamError, actionSuccess: teamSuccess } = useAppSelector((s) => s.team);
  const { users, isLoading: usersLoading } = useAppSelector((s) => s.user);
  // currentUser no longer needed – teams are station‑agnostic
  // const { user: currentUser } = useAppSelector((s) => s.auth);

  const isLoading = teamsLoading || usersLoading;

  const [selectedTeam, setSelectedTeam]                 = useState<Team | null>(null);
  const [addMemberDialogOpen, setAddMemberDialogOpen]   = useState(false);
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName]                   = useState('');
  const [selectedUserId, setSelectedUserId]             = useState<number | ''>('');
  const [isTeamLead, setIsTeamLead]                     = useState(false);

  // ── Fetch data on mount ───────────────────────────────────────────────────
  useEffect(() => {
    dispatch(resetTeamSuccess());
    dispatch(fetchTeams());
    dispatch(fetchUsers());
  }, [dispatch]);

  // ── Action success ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!teamSuccess) return;
    toast.success('Operation completed successfully!');
    dispatch(resetTeamSuccess());
    dispatch(fetchTeams());
  }, [teamSuccess, dispatch]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    const result = await dispatch(createTeam({ name: newTeamName }));
    if (createTeam.fulfilled.match(result)) {
      toast.success(`Team "${newTeamName}" created successfully!`);
      setCreateTeamDialogOpen(false);
      setNewTeamName('');
    } else {
      toast.error(result.payload as string || 'Failed to create team');
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam || selectedUserId === '') {
      toast.error('Please select a user.');
      return;
    }
    await dispatch(addTeamMember({
      team_id:      selectedTeam.id,
      user_id:      selectedUserId as number,
      is_team_lead: isTeamLead,
    }));
    setAddMemberDialogOpen(false);
    setSelectedUserId('');
    setIsTeamLead(false);
  };

  const handleRemoveMember = async (teamId: number, userId: number) => {
    if (!window.confirm('Remove this member from the team?')) return;
    await dispatch(removeTeamMember({ team_id: teamId, user_id: userId }));
  };

  const openAddMember = (team: Team) => {
    setSelectedTeam(team);
    setSelectedUserId('');
    setIsTeamLead(false);
    setAddMemberDialogOpen(true);
  };

  // Users not already in the selected team
  const availableUsers = selectedTeam
    ? users.filter(u => !selectedTeam.members?.some(m => m.user_id === u.id))
    : users;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full p-4 sm:p-6" style={{ background: '#fdf8f0' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif" style={{ color: '#1a3d1c' }}>Teams Management</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
            {teams.length} team{teams.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button
          onClick={() => setCreateTeamDialogOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
          style={{ background: '#1a3d1c', color: '#fdf8f0' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2d6a4f')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1a3d1c')}
        >
          <Plus size={18} className="mr-2 font-serif" />
          Create New Team
        </button>
      </div>

      {/* Error message */}
      {teamError && (
        <div
          className="mb-4 p-4 rounded-lg flex justify-between items-center"
          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}
        >
          <span className="text-sm">{teamError}</span>
          <button
            onClick={() => dispatch({ type: 'team/clearError' })}
            className="transition-colors"
            style={{ color: '#b91c1c' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#c9a84c' }} />
        </div>
      ) : teams.length === 0 ? (
        <div
          className="p-6 rounded-lg text-center"
          style={{ background: '#fff3cd', border: '1.5px solid #ffc107' }}
        >
          <Users size={32} className="mx-auto mb-2" style={{ color: '#c9a84c' }} />
          <p className="font-medium" style={{ color: '#856404' }}>No teams yet.</p>
          <p className="text-sm mt-1" style={{ color: '#856404' }}>
            Click "Create New Team" to get started.
          </p>
        </div>
      ) : (
        /* Teams Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {teams.map((team) => (
            <div
              key={team.id}
              className="rounded-xl overflow-hidden transition-all hover:shadow-md"
              style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}
            >
              <div className="p-4 sm:p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={20} style={{ color: '#c9a84c' }} />
                    <h3 className="text-base sm:text-lg font-semibold" style={{ color: '#1a3d1c' }}>
                      {team.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => openAddMember(team)}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-sm transition-colors"
                    style={{ background: '#f0e8d6', color: '#1a3d1c' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#e6ddc8')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#f0e8d6')}
                  >
                    <UserPlus size={14} className="mr-1" />
                    Add Member
                  </button>
                </div>

                <p className="text-xs mb-4" style={{ color: '#a8c5a0' }}>
                  {team.members?.length ?? 0} member{(team.members?.length ?? 0) !== 1 ? 's' : ''}
                </p>

                {team.members?.length ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {team.members.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex justify-between items-center p-2 rounded-md"
                        style={{ background: '#fdf8f0', border: '1px solid #f0e8d6' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-sm truncate" style={{ color: '#1a3d1c' }}>
                              {member.full_name}
                            </span>
                            {member.is_team_lead && (
                              <span
                                className="shrink-0 px-2 py-0.5 text-xs rounded-full"
                                style={{ background: '#c9a84c/20', color: '#c9a84c' }}
                              >
                                Team Lead
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5 truncate" style={{ color: '#6b7280' }}>{member.email}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(team.id, member.user_id)}
                          className="ml-2 p-1 rounded transition-colors shrink-0"
                          style={{ color: '#c0392b' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#922b21')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#c0392b')}
                          title="Remove member"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-center py-4" style={{ color: '#a8c5a0' }}>
                    No members yet. Click "Add Member".
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Team Modal (no station selector) ── */}
      {createTeamDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-xl w-full max-w-md overflow-hidden"
            style={{ background: '#fdf8f0', border: '1.5px solid #d6c9a8' }}
          >
            <div className="flex justify-between items-center p-5 pb-0">
              <h2 className="text-xl font-semibold" style={{ color: '#1a3d1c' }}>Create New Team</h2>
              <button
                onClick={() => { setCreateTeamDialogOpen(false); setNewTeamName(''); }}
                className="transition-colors"
                style={{ color: '#a8c5a0' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#c0392b')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a8c5a0')}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium mb-2" style={{ color: '#1a3d1c' }}>Team Name</label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Civil Division Team"
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
              />

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => { setCreateTeamDialogOpen(false); setNewTeamName(''); }}
                  className="px-4 py-2 rounded-md transition-colors"
                  style={{ background: '#f0e8d6', color: '#6b7280' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#e6ddc8')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#f0e8d6')}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim()}
                  className="px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#1a3d1c', color: '#fdf8f0' }}
                  onMouseEnter={(e) => { if (newTeamName.trim()) e.currentTarget.style.background = '#2d6a4f'; }}
                  onMouseLeave={(e) => { if (newTeamName.trim()) e.currentTarget.style.background = '#1a3d1c'; }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Member Modal ── */}
      {addMemberDialogOpen && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-xl w-full max-w-md overflow-hidden"
            style={{ background: '#fdf8f0', border: '1.5px solid #d6c9a8' }}
          >
            <div className="flex justify-between items-center p-5 pb-0">
              <h2 className="text-xl font-semibold" style={{ color: '#1a3d1c' }}>
                Add Member to <span style={{ color: '#c9a84c' }}>{selectedTeam.name}</span>
              </h2>
              <button
                onClick={() => { setAddMemberDialogOpen(false); setSelectedUserId(''); setIsTeamLead(false); }}
                className="transition-colors"
                style={{ color: '#a8c5a0' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#c0392b')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a8c5a0')}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              {availableUsers.length === 0 ? (
                <div className="py-6 text-center">
                  <UserPlus size={28} className="mx-auto mb-2" style={{ color: '#a8c5a0' }} />
                  <p className="font-medium" style={{ color: '#6b7280' }}>No available users.</p>
                  <p className="text-sm mt-1" style={{ color: '#a8c5a0' }}>
                    Create users first from the <span style={{ color: '#c9a84c' }}>Users</span> page.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#1a3d1c' }}>Select User</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 transition-colors"
                      style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
                    >
                      <option value="">-- Select a user --</option>
                      {availableUsers.map((u: User) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} — {u.pj_number}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTeamLead}
                      onChange={(e) => setIsTeamLead(e.target.checked)}
                      className="rounded focus:ring-2"
                      style={{ borderColor: '#d6c9a8', accentColor: '#c9a84c' }}
                    />
                    <span className="text-sm" style={{ color: '#1a3d1c' }}>Set as Team Lead</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => { setAddMemberDialogOpen(false); setSelectedUserId(''); setIsTeamLead(false); }}
                  className="px-4 py-2 rounded-md transition-colors"
                  style={{ background: '#f0e8d6', color: '#6b7280' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#e6ddc8')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#f0e8d6')}
                >
                  Cancel
                </button>
                {availableUsers.length > 0 && (
                  <button
                    onClick={handleAddMember}
                    disabled={selectedUserId === ''}
                    className="px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#1a3d1c', color: '#fdf8f0' }}
                    onMouseEnter={(e) => { if (selectedUserId !== '') e.currentTarget.style.background = '#2d6a4f'; }}
                    onMouseLeave={(e) => { if (selectedUserId !== '') e.currentTarget.style.background = '#1a3d1c'; }}
                  >
                    Add Member
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeams;