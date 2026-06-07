// src/components/admin/AdminComponents.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchComponents, type Component } from '../../store/slices/componentSlice';
import {
  fetchAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  type Assignment,
} from '../../store/slices/assignmentSlice';
import { fetchTeams, type Team } from '../../store/slices/teamSlice';
import type { AppDispatch, RootState } from '../../store/store';
import { Loader2, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewTab = 'admin' | 'member' | 'overview';

// Flat member shape used across dropdowns
interface FlatMember {
  user_id: number;
  full_name: string;
  email: string;
  is_team_lead: boolean;
  team_id: number;
  team_name: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Assignment['status'], { label: string; classes: string }> = {
  pending:     { label: 'Pending',     classes: 'bg-amber-100 text-amber-800' },
  in_progress: { label: 'In Progress', classes: 'bg-blue-100 text-blue-800'   },
  submitted:   { label: 'Submitted',   classes: 'bg-green-100 text-green-800' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Flatten teams → deduped member list with team context */
const flattenTeamMembers = (teams: Team[]): FlatMember[] => {
  const seen = new Set<number>();
  const result: FlatMember[] = [];
  for (const team of teams) {
    for (const m of team.members ?? []) {
      if (!seen.has(m.user_id)) {
        seen.add(m.user_id);
        result.push({
          user_id:     m.user_id,
          full_name:   m.full_name,
          email:       m.email,
          is_team_lead: m.is_team_lead,
          team_id:     team.id,
          team_name:   team.name,
        });
      }
    }
  }
  return result;
};

// ─── Grouped <select> for team members ───────────────────────────────────────

const TeamMemberSelect: React.FC<{
  teams: Team[];
  value: number | '';
  onChange: (userId: number | '') => void;
  style?: React.CSSProperties;
  className?: string;
}> = ({ teams, value, onChange, style, className }) => {
  const teamsWithMembers = teams.filter((t) => (t.members?.length ?? 0) > 0);

  return (
    <select
      className={`w-full md:w-auto ${className || ''}`}
      style={style}
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
    >
      <option value="">— Select member —</option>
      {teamsWithMembers.map((team) => (
        <optgroup key={team.id} label={team.name}>
          {(team.members ?? []).map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.is_team_lead ? '★ ' : ''}{m.full_name}
              {m.email ? ` (${m.email})` : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const Sidebar: React.FC<{
  components: Component[];
  assignments: Assignment[];
  activeIndex: number;
  onSelect: (i: number) => void;
}> = ({ components, assignments, activeIndex, onSelect }) => (
  <aside
    className="w-full md:w-64 flex-shrink-0 flex flex-col overflow-y-auto border-r-0 md:border-r border-[#2c5f2e] max-h-[40vh] md:max-h-full"
    style={{ background: '#1a3d1c', height: '100%' }}
  >
    <div
      className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest"
      style={{ color: '#c9a84c', borderBottom: '1px solid rgba(201,168,76,0.2)' }}
    >
      Sections
    </div>

    <nav className="flex-1 py-2">
      {components.map((c, i) => {
        const assignment = assignments.find((a) => a.component_id === c.id);
        const isActive = activeIndex === i;

        return (
          <button
            key={c.id}
            onClick={() => onSelect(i)}
            className="w-full text-left flex items-center gap-2 px-3 py-2 mx-1.5 rounded-lg transition-colors"
            style={{ width: 'calc(100% - 12px)', background: isActive ? '#c9a84c' : 'transparent' }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{
                background: isActive ? '#1a3d1c' : 'rgba(255,255,255,0.12)',
                color: isActive ? '#c9a84c' : '#e9c46a',
              }}
            >
              {i + 1}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] truncate leading-tight"
                style={{ color: isActive ? '#1a3d1c' : '#fdf8f0', fontWeight: isActive ? 600 : 400 }}
              >
                {c.name}
              </p>
              <p
                className="text-[11px] truncate mt-0.5"
                style={{
                  color: isActive
                    ? '#2d6a4f'
                    : assignment
                    ? '#e9c46a'
                    : 'rgba(255,255,255,0.4)',
                }}
              >
                {assignment ? assignment.user_full_name : 'Unassigned'}
              </p>
            </div>

            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: assignment
                  ? assignment.status === 'submitted'
                    ? '#27ae60'
                    : '#c9a84c'
                  : 'rgba(255,255,255,0.18)',
              }}
            />
          </button>
        );
      })}
    </nav>
  </aside>
);

// ─── Assign Modal ─────────────────────────────────────────────────────────────

interface AssignModalProps {
  component: Component;
  existingAssignment: Assignment | undefined;
  teams: Team[];
  isLoading: boolean;
  onAssign: (userId: number) => void;
  onClose: () => void;
}

const AssignModal: React.FC<AssignModalProps> = ({
  component,
  existingAssignment,
  teams,
  isLoading,
  onAssign,
  onClose,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<number | ''>(
    existingAssignment?.user_id ?? '',
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-xl shadow-2xl w-full max-w-[420px] overflow-hidden" style={{ background: '#fdf8f0', border: '1.5px solid #d6c9a8' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#1a3d1c' }}>
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: '#fdf8f0' }}>
              Assign Inspection Form
            </h3>
            <p className="text-[12px] mt-0.5" style={{ color: '#a8c5a0' }}>{component.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 transition-colors"
            style={{ color: '#a8c5a0' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fdf8f0')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#a8c5a0')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {existingAssignment && (
            <div
              className="mb-4 px-3 py-2.5 rounded-lg text-[12px]"
              style={{ background: '#fff3cd', border: '1.5px solid #ffc107', color: '#856404' }}
            >
              Currently assigned to <strong>{existingAssignment.user_full_name}</strong>.
              Selecting a new user will reassign this form.
            </div>
          )}

          <label
            className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: '#6b7280' }}
          >
            Select Inspector &nbsp;
            <span style={{ color: '#c9a84c', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              ★ = team lead
            </span>
          </label>

          <TeamMemberSelect
            teams={teams}
            value={selectedUserId}
            onChange={setSelectedUserId}
            className="rounded-lg px-3 py-2 text-sm outline-none mb-5"
            style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c', fontFamily: 'inherit' }}
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#6b7280' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0e8d6')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            >
              Cancel
            </button>
            <button
              onClick={() => selectedUserId !== '' && onAssign(selectedUserId as number)}
              disabled={selectedUserId === '' || isLoading}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: '#1a3d1c', color: '#fdf8f0' }}
              onMouseEnter={(e) => { if (selectedUserId !== '') e.currentTarget.style.background = '#2d6a4f'; }}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#1a3d1c')}
            >
              {isLoading ? 'Saving…' : existingAssignment ? 'Reassign' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Admin/Assign Tab ─────────────────────────────────────────────────────────

const AdminTab: React.FC<{
  components: Component[];
  assignments: Assignment[];
  teams: Team[];
  isLoading: boolean;
  onAssign: (componentId: number, userId: number) => void;
  onDelete: (assignmentId: number) => void;
}> = ({ components, assignments, teams, isLoading, onAssign, onDelete }) => {
  const [localSelections, setLocalSelections] = useState<Record<number, number | ''>>({});
  const assignedCount = assignments.length;

  return (
    <div>
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1.5px solid #d6c9a8' }}>
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: '#1a3d1c' }}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: '#fdf8f0' }}>
              Section Assignment
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: '#a8c5a0' }}>
              Assign each inspection section to a team member &nbsp;·&nbsp;
              <span style={{ color: '#e9c46a' }}>★ = team lead</span>
            </p>
          </div>
          <div
            className="sm:ml-auto px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap self-start"
            style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}
          >
            {assignedCount} / {components.length} assigned
          </div>
        </div>

        <div className="divide-y divide-[#f0e8d6]" style={{ background: '#fdf8f0' }}>
          {components.map((c) => {
            const existing = assignments.find((a) => a.component_id === c.id);
            const localVal = localSelections[c.id] ?? (existing?.user_id ?? '');

            return (
              <div
                key={c.id}
                className="flex flex-col md:flex-row items-start md:items-center gap-3 px-4 py-3 md:px-5 md:py-3.5 transition-colors"
                style={{ borderBottom: '1px solid #f0e8d6', background: existing ? '#f0f9f5' : '#fdf8f0' }}
              >
                <div className="flex-1 min-w-0 w-full md:w-auto">
                  <p className="text-[13px] font-semibold" style={{ color: '#1a3d1c' }}>{c.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>{c.section}</p>
                </div>

                <div className="w-full md:w-auto min-w-[200px]">
                  <TeamMemberSelect
                    teams={teams}
                    value={localVal}
                    onChange={(uid) => {
                      setLocalSelections((prev) => ({ ...prev, [c.id]: uid }));
                      if (uid !== '') onAssign(c.id, uid as number);
                    }}
                    className="rounded-lg px-3 py-1.5 text-[13px] outline-none"
                    style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c', fontFamily: 'inherit' }}
                  />
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-3">
                  <div
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{
                      background: existing ? '#d4edda' : '#f0e8d6',
                      color: existing ? '#155724' : '#6b7280',
                      minWidth: '80px',
                      textAlign: 'center',
                    }}
                  >
                    {existing ? '✓ Assigned' : 'Pending'}
                  </div>

                  {existing && (
                    <button
                      onClick={() => onDelete(existing.id)}
                      disabled={isLoading}
                      className="text-[11px] font-medium transition-colors disabled:opacity-50"
                      style={{ color: '#c0392b' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#922b21')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#c0392b')}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Member View Tab ──────────────────────────────────────────────────────────

const MemberTab: React.FC<{
  component: Component;
  assignment: Assignment | undefined;
  componentIndex: number;
  totalComponents: number;
}> = ({ component, assignment, componentIndex, totalComponents }) => (
  <div>
    <div className="flex items-start gap-4 mb-5">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[16px] font-bold"
        style={{ background: '#1a3d1c', color: '#c9a84c', fontFamily: 'serif' }}
      >
        {componentIndex + 1}
      </div>
      <div>
        <h2 className="text-[20px] font-bold break-words" style={{ color: '#1a3d1c', fontFamily: 'serif' }}>
          {component.name}
        </h2>
        <p className="text-[13px] mt-0.5" style={{ color: '#6b7280' }}>
          {component.section} &nbsp;·&nbsp; {componentIndex + 1} of {totalComponents}
        </p>
      </div>
    </div>

    {assignment ? (
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg px-4 py-3 mb-5"
        style={{ background: 'linear-gradient(90deg, #1a3d1c, #2d6a4f)', color: '#fff' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
            style={{ background: '#c9a84c', color: '#1a3d1c' }}
          >
            {assignment.user_full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="text-[13px]">
            Assigned to <strong style={{ color: '#e9c46a' }}>{assignment.user_full_name}</strong>
            &nbsp;·&nbsp; Please complete all fields below
          </div>
        </div>
        <div className="sm:ml-auto">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[assignment.status].classes}`}>
            {STATUS_STYLES[assignment.status].label}
          </span>
        </div>
      </div>
    ) : (
      <div
        className="rounded-lg px-4 py-3 mb-5 text-[13px]"
        style={{ background: '#fff3cd', border: '1.5px solid #ffc107', color: '#856404' }}
      >
        ⚠ Not yet assigned. Go to <strong>Admin / Assign</strong> to assign this section to a team member.
      </div>
    )}

    <div
      className="rounded-xl p-6 text-center"
      style={{ background: '#f0f9f5', border: '1.5px dashed #40916c' }}
    >
      <p className="text-[13px]" style={{ color: '#2d6a4f' }}>
        Form fields for <strong>{component.name}</strong> will render here from the backend form_json definition.
      </p>
    </div>
  </div>
);

// ─── Team Overview Tab ────────────────────────────────────────────────────────

const OverviewTab: React.FC<{
  components: Component[];
  assignments: Assignment[];
  teams: Team[];
}> = ({ components, assignments, teams }) => {
  const assignedCount = assignments.length;
  const pct = components.length > 0 ? Math.round((assignedCount / components.length) * 100) : 0;

  // Build per-user component list using flat members from teams
  const allMembers = useMemo(() => flattenTeamMembers(teams), [teams]);

  const byUser = useMemo(() => {
    const map: Record<number, { member: FlatMember; components: Component[] }> = {};
    allMembers.forEach((m) => { map[m.user_id] = { member: m, components: [] }; });
    components.forEach((c) => {
      const a = assignments.find((x) => x.component_id === c.id);
      if (a) {
        if (!map[a.user_id]) {
          // assigned to someone not in any team (edge case)
          map[a.user_id] = {
            member: { user_id: a.user_id, full_name: a.user_full_name, email: '', is_team_lead: false, team_id: 0, team_name: 'Unknown Team' },
            components: [],
          };
        }
        map[a.user_id].components.push(c);
      }
    });
    return Object.values(map);
  }, [components, assignments, allMembers]);

  const unassigned = components.filter((c) => !assignments.find((a) => a.component_id === c.id));

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
          <h2 className="text-[17px] font-bold" style={{ color: '#1a3d1c', fontFamily: 'serif' }}>
            Team Assignment Overview
          </h2>
          <span className="text-[12px]" style={{ color: '#6b7280' }}>
            {assignedCount} of {components.length} sections assigned ({pct}%)
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#f0e8d6' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: '#1a3d1c' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {byUser.filter((u) => u.components.length > 0).map(({ member, components: uComps }) => (
          <div
            key={member.user_id}
            className="rounded-xl p-4"
            style={{ background: '#fff', border: '1.5px solid #d6c9a8', boxShadow: '0 2px 8px rgba(26,71,49,0.06)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold mb-2"
              style={{ background: '#1a3d1c', color: '#c9a84c' }}
            >
              {member.full_name[0]?.toUpperCase()}
            </div>
            <h3 className="text-[14px] font-semibold break-words" style={{ color: '#1a3d1c' }}>
              {member.is_team_lead ? '★ ' : ''}{member.full_name}
            </h3>
            <p className="text-[11px] mb-1" style={{ color: '#c9a84c' }}>{member.team_name}</p>
            <p className="text-[12px] mb-2" style={{ color: '#6b7280' }}>
              {uComps.length} section{uComps.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-col gap-1">
              {uComps.map((c) => (
                <div key={c.id} className="text-[11px] px-2 py-1 rounded break-words" style={{ background: '#f0e8d6', color: '#2d6a4f', fontWeight: 500 }}>
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        ))}

        {unassigned.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: '#fff', border: '1.5px solid #ffc107', boxShadow: '0 2px 8px rgba(26,71,49,0.06)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold mb-2" style={{ background: '#ffeeba', color: '#856404' }}>?</div>
            <h3 className="text-[14px] font-semibold" style={{ color: '#856404' }}>Unassigned</h3>
            <p className="text-[12px] mb-2" style={{ color: '#6b7280' }}>{unassigned.length} section{unassigned.length !== 1 ? 's' : ''}</p>
            <div className="flex flex-col gap-1">
              {unassigned.map((c) => (
                <div key={c.id} className="text-[11px] px-2 py-1 rounded break-words" style={{ background: '#fff3cd', color: '#856404', fontWeight: 500 }}>{c.name}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid #d6c9a8', boxShadow: '0 2px 8px rgba(26,71,49,0.06)' }}>
        <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: '#1a3d1c' }}>
          <div>
            <h3 className="text-[14px] font-semibold" style={{ color: '#fdf8f0' }}>Assignment Summary</h3>
            <p className="text-[11px]" style={{ color: '#a8c5a0' }}>Full section-by-member breakdown</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr style={{ background: '#1a3d1c' }}>
                {['#', 'Section', 'Team', 'Assigned To', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#c9a84c' }}>
                    {h}
                  </th>
                ))}
               </tr>
            </thead>
            <tbody>
              {components.map((c, i) => {
                const a = assignments.find((x) => x.component_id === c.id);
                const member = a ? allMembers.find((m) => m.user_id === a.user_id) : undefined;
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f0e8d6', background: i % 2 === 0 ? '#fdf8f0' : '#fff' }}>
                    <td className="px-4 py-2.5 text-[12px]" style={{ color: '#6b7280' }}>{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <p className="text-[13px] font-semibold" style={{ color: '#1a3d1c' }}>{c.name}</p>
                      <p className="text-[11px]" style={{ color: '#6b7280' }}>{c.section}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[12px]" style={{ color: '#c9a84c' }}>
                      {member?.team_name ?? '—'}
                     </td>
                    <td className="px-4 py-2.5 text-[13px]" style={{ color: a ? '#1c1c1c' : '#c0392b' }}>
                      {a ? (
                        <span>{member?.is_team_lead ? '★ ' : ''}{a.user_full_name}</span>
                      ) : 'Unassigned'}
                     </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ background: a ? '#d4edda' : '#ffeeba', color: a ? '#155724' : '#856404' }}
                      >
                        {a ? STATUS_STYLES[a.status].label : 'Pending'}
                      </span>
                     </td>
                   </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminComponents: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { components, isLoading: componentsLoading, error: componentError, actionSuccess: componentSuccess } = useSelector(
    (state: RootState) => state.component,
  );
  const { assignments, isLoading: assignmentsLoading, error: assignmentError, actionSuccess: assignmentSuccess } = useSelector(
    (state: RootState) => state.assignment,
  );
  const { teams, isLoading: teamsLoading } = useSelector((state: RootState) => state.team);

  const [activeView, setActiveView] = useState<ViewTab>('admin');
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [componentToAssign, setComponentToAssign] = useState<Component | null>(null);

  const isLoading = componentsLoading || assignmentsLoading || teamsLoading;
  const error = componentError || assignmentError;
  const actionSuccess = componentSuccess || assignmentSuccess;

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchComponents({}));
    dispatch(fetchAssignments({}));
    dispatch(fetchTeams());
  }, [dispatch]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const currentComponent = components[activeIndex] ?? null;
  const assignmentForCurrent = useMemo(
    () => currentComponent ? assignments.find((a) => a.component_id === currentComponent.id) : undefined,
    [assignments, currentComponent],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAssignDirect = async (componentId: number, userId: number) => {
    const existing = assignments.find((a) => a.component_id === componentId);
    if (existing) {
      await dispatch(updateAssignment({ id: existing.id, user_id: userId }));
    } else {
      await dispatch(createAssignment({ component_id: componentId, user_id: userId }));
    }
  };

  const handleAssignFromModal = async (userId: number) => {
    if (!componentToAssign) return;
    await handleAssignDirect(componentToAssign.id, userId);
    setShowAssignModal(false);
    setComponentToAssign(null);
  };

  const handleDelete = async (assignmentId: number) => {
    if (!window.confirm('Remove this assignment?')) return;
    await dispatch(deleteAssignment(assignmentId));
  };

  // ── Loading state ───────────────────────────────────────────────────────────

  if (isLoading && components.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin" style={{ color: '#2c5f2e' }} />
        <span className="ml-2 text-sm" style={{ color: '#5c5144' }}>Loading inspection forms…</span>
      </div>
    );
  }

  const TABS: { key: ViewTab; label: string }[] = [
    { key: 'admin',    label: '👤 Admin / Assign' },
    { key: 'member',   label: '📋 Member View'    },
    { key: 'overview', label: '📊 Team Overview'  },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden" style={{ background: '#fdf8f0' }}>

      <Sidebar
        components={components}
        assignments={assignments}
        activeIndex={activeIndex}
        onSelect={(i) => { setActiveIndex(i); setActiveView('member'); }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">

        <div
          className="flex flex-wrap items-center gap-2 px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #d6c9a8', background: '#fff' }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveView(t.key)}
              className="px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: activeView === t.key ? '#1a3d1c' : '#fff',
                color: activeView === t.key ? '#fff' : '#6b7280',
                border: `1.5px solid ${activeView === t.key ? '#1a3d1c' : '#d6c9a8'}`,
              }}
            >
              {t.label}
            </button>
          ))}

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <div className="px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap" style={{ background: '#f0e8d6', color: '#2d6a4f' }}>
              {assignments.length} / {components.length} assigned
            </div>

            {currentComponent && activeView === 'member' && (
              <button
                onClick={() => { setComponentToAssign(currentComponent); setShowAssignModal(true); }}
                className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors"
                style={{ background: '#c9a84c', color: '#1a3d1c' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#e9c46a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#c9a84c')}
              >
                {assignmentForCurrent ? 'Reassign' : 'Assign to User'}
              </button>
            )}
          </div>
        </div>

        <div className="px-6 pt-4 flex-shrink-0">
          {error && (
            <div className="flex items-center justify-between px-4 py-3 rounded-lg mb-3 text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
              <span>{error}</span>
            </div>
          )}
          {actionSuccess && (
            <div className="px-4 py-3 rounded-lg mb-3 text-sm" style={{ background: '#d4edda', border: '1px solid #c3e6cb', color: '#155724' }}>
              ✓ Action completed successfully.
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
          {activeView === 'admin' && (
            <AdminTab
              components={components}
              assignments={assignments}
              teams={teams}
              isLoading={isLoading}
              onAssign={handleAssignDirect}
              onDelete={handleDelete}
            />
          )}

          {activeView === 'member' && currentComponent && (
            <MemberTab
              component={currentComponent}
              assignment={assignmentForCurrent}
              componentIndex={activeIndex}
              totalComponents={components.length}
            />
          )}

          {activeView === 'overview' && (
            <OverviewTab
              components={components}
              assignments={assignments}
              teams={teams}
            />
          )}
        </div>
      </div>

      {showAssignModal && componentToAssign && (
        <AssignModal
          component={componentToAssign}
          existingAssignment={assignments.find((a) => a.component_id === componentToAssign.id)}
          teams={teams}
          isLoading={isLoading}
          onAssign={handleAssignFromModal}
          onClose={() => { setShowAssignModal(false); setComponentToAssign(null); }}
        />
      )}
    </div>
  );
};

export default AdminComponents;