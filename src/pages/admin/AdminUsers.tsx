// src/pages/admin/AdminUsers.tsx
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserSuccess,
  clearUserError,
  type User,
} from '../../store/slices/userSlice';
import { Plus, Pencil, Trash2, X, UserCog, Search, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserForm {
  full_name:  string;
  email:      string;
  pj_number:  string;
  role:       'user' | 'admin';
}

const EMPTY_FORM: UserForm = {
  full_name: '',
  email:     '',
  pj_number: '',
  role:      'user',
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminUsers = () => {
  const dispatch = useAppDispatch();
  const { users, isLoading, error, actionSuccess } = useAppSelector((s) => s.user);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen]     = useState(false);
  const [selectedUser, setSelectedUser]         = useState<User | null>(null);
  const [form, setForm]                         = useState<UserForm>(EMPTY_FORM);
  const [search, setSearch]                     = useState('');

  // ── Fetch on mount ───────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(resetUserSuccess());
    dispatch(fetchUsers());
  }, [dispatch]);

  // ── Action success ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!actionSuccess) return;
    toast.success('Operation completed successfully!');
    dispatch(resetUserSuccess());
    dispatch(fetchUsers());
  }, [actionSuccess, dispatch]);

  // ── Error toast ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!error) return;
    toast.error(error);
    dispatch(clearUserError());
  }, [error, dispatch]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    const { full_name, email, pj_number, role } = form;
    if (!full_name.trim() || !email.trim() || !pj_number.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    await dispatch(createUser({ full_name, email, pj_number, role }));
    setCreateDialogOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setForm({
      full_name: user.full_name,
      email:     user.email,
      pj_number: user.pj_number ?? '',
      role:      user.role === 'admin' ? 'admin' : 'user',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    const { full_name, email, pj_number, role } = form;
    if (!full_name.trim() || !email.trim() || !pj_number.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    await dispatch(updateUser({ id: selectedUser.id, full_name, email, pj_number, role }));
    setEditDialogOpen(false);
    setSelectedUser(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Remove ${user.full_name}? This cannot be undone.`)) return;
    await dispatch(deleteUser(user.id));
  };

  const handleCloseCreate = () => { setCreateDialogOpen(false); setForm(EMPTY_FORM); };
  const handleCloseEdit   = () => { setEditDialogOpen(false); setSelectedUser(null); setForm(EMPTY_FORM); };

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = users.filter((u) =>
    [u.full_name, u.email, u.pj_number ?? ''].some((v) =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  );

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-amber-100 text-amber-800';
      case 'admin':       return 'bg-[#c9a84c]/20 text-[#c9a84c]';
      default:            return 'bg-[#a8c5a0]/20 text-[#2d6a4f]';
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="w-full p-4 sm:p-6" style={{ background: '#fdf8f0' }}>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif" style={{ color: '#1a3d1c' }}>Users</h1>
          <p className="text-sm mt-1 font-serif" style={{ color: '#6b7280' }}>{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setCreateDialogOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
          style={{ background: '#1a3d1c', color: '#fdf8f0' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2d6a4f')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1a3d1c')}
        >
          <Plus size={18} className="mr-2" />
          Create User
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8c5a0' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or PJ number..."
          className="w-full pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 text-sm"
          style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: '#a8c5a0' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#c0392b')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#a8c5a0')}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Loading ── */}
      {isLoading && !users.length ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#c9a84c' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#a8c5a0' }}>
          <UserCog size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">
            {search ? 'No users match your search.' : 'No users yet. Click "Create User" to add one.'}
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table View (md and up) ── */}
          <div className="hidden md:block overflow-x-auto rounded-lg" style={{ border: '1.5px solid #d6c9a8', background: '#fff' }}>
            <table className="w-full text-sm min-w-[640px]">
              <thead style={{ background: '#1a3d1c' }}>
                <tr>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#c9a84c' }}>Name</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#c9a84c' }}>Email</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#c9a84c' }}>PJ Number</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#c9a84c' }}>Role</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#c9a84c' }}>Station</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#c9a84c' }}>Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#f0e8d6' }}>
                {filtered.map((user, idx) => (
                  <tr key={user.id} className="transition-colors hover:bg-[#f0f9f5]" style={{ background: idx % 2 === 0 ? '#fdf8f0' : '#fff' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: '#1a3d1c' }}>{user.full_name}</td>
                    <td className="px-4 py-3" style={{ color: '#4a5c3c' }}>{user.email}</td>
                    <td className="px-4 py-3" style={{ color: '#6b7280' }}>{user.pj_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#6b7280' }}>{user.station_id ?? '—'}</td>
                    <td className="px-4 py-3" style={{ color: '#a8c5a0' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: '#a8c5a0' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#c9a84c')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#a8c5a0')}
                          title="Edit user"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: '#a8c5a0' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#c0392b')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#a8c5a0')}
                          title="Delete user"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Card View (below md) ── */}
          <div className="md:hidden space-y-4">
            {filtered.map((user) => (
              <div
                key={user.id}
                className="rounded-xl p-4"
                style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: '#1a3d1c' }}>{user.full_name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{user.email}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: '#a8c5a0' }}>PJ:</span>
                    <span style={{ color: '#1c1c1c' }}>{user.pj_number ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: '#a8c5a0' }}>Station:</span>
                    <span style={{ color: '#1c1c1c' }}>{user.station_id ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={12} style={{ color: '#a8c5a0' }} />
                    <span className="text-xs" style={{ color: '#6b7280' }}>
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: '#f0e8d6' }}>
                  <button
                    onClick={() => handleEdit(user)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={{ background: '#f0e8d6', color: '#1a3d1c' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#e6ddc8')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#f0e8d6')}
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={{ background: '#fee2e2', color: '#c0392b' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fecaca')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fee2e2')}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Create User Modal ── */}
      {createDialogOpen && (
        <Modal title="Create New User" onClose={handleCloseCreate}>
          <UserForm form={form} setForm={setForm} />
          <ModalFooter
            onCancel={handleCloseCreate}
            onConfirm={handleCreate}
            confirmLabel="Create"
            disabled={!form.full_name.trim() || !form.email.trim() || !form.pj_number.trim()}
          />
        </Modal>
      )}

      {/* ── Edit User Modal ── */}
      {editDialogOpen && selectedUser && (
        <Modal title={`Edit — ${selectedUser.full_name}`} onClose={handleCloseEdit}>
          <UserForm form={form} setForm={setForm} />
          <ModalFooter
            onCancel={handleCloseEdit}
            onConfirm={handleUpdate}
            confirmLabel="Save Changes"
            disabled={!form.full_name.trim() || !form.email.trim() || !form.pj_number.trim()}
          />
        </Modal>
      )}
    </div>
  );
};

// ─── Shared modal shell ───────────────────────────────────────────────────────

const Modal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="rounded-xl w-full max-w-md" style={{ background: '#fdf8f0', border: '1.5px solid #d6c9a8' }}>
      <div className="flex justify-between items-center p-5 pb-0">
        <h2 className="text-xl font-semibold" style={{ color: '#1a3d1c' }}>{title}</h2>
        <button onClick={onClose} className="transition-colors" style={{ color: '#a8c5a0' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#c0392b')} onMouseLeave={(e) => (e.currentTarget.style.color = '#a8c5a0')}>
          <X size={20} />
        </button>
      </div>
      <div className="p-5 pt-3">
        {children}
      </div>
    </div>
  </div>
);

// ─── Shared form fields ───────────────────────────────────────────────────────

const UserForm = ({
  form,
  setForm,
}: {
  form: UserForm;
  setForm: React.Dispatch<React.SetStateAction<UserForm>>;
}) => (
  <div className="space-y-4 mb-6">
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: '#1a3d1c' }}>Full Name *</label>
      <input
        type="text"
        value={form.full_name}
        onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))}
        placeholder="e.g. Jane Njeri"
        className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 transition-colors"
        style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: '#1a3d1c' }}>Email Address *</label>
      <input
        type="email"
        value={form.email}
        onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
        placeholder="e.g. jane.njeri@judiciary.go.ke"
        className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 transition-colors"
        style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: '#1a3d1c' }}>PJ Number *</label>
      <input
        type="text"
        value={form.pj_number}
        onChange={(e) => setForm(p => ({ ...p, pj_number: e.target.value }))}
        placeholder="e.g. 00042"
        className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 transition-colors"
        style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: '#1a3d1c' }}>Role</label>
      <select
        value={form.role}
        onChange={(e) => setForm(p => ({ ...p, role: e.target.value as 'user' | 'admin' }))}
        className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 transition-colors"
        style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
      >
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
    </div>
  </div>
);

// ─── Shared modal footer ──────────────────────────────────────────────────────

const ModalFooter = ({
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
}: {
  onCancel:     () => void;
  onConfirm:    () => void;
  confirmLabel: string;
  disabled:     boolean;
}) => (
  <div className="flex justify-end space-x-2">
    <button
      onClick={onCancel}
      className="px-4 py-2 rounded-md transition-colors"
      style={{ background: '#f0e8d6', color: '#6b7280' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#e6ddc8')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#f0e8d6')}
    >
      Cancel
    </button>
    <button
      onClick={onConfirm}
      disabled={disabled}
      className="px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: '#1a3d1c', color: '#fdf8f0' }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = '#2d6a4f'; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = '#1a3d1c'; }}
    >
      {confirmLabel}
    </button>
  </div>
);

// ─── Type alias for the form component prop ───────────────────────────────────

interface UserForm {
  full_name:  string;
  email:      string;
  pj_number:  string;
  role:       'user' | 'admin';
}

export default AdminUsers;