// src/components/super-admin/SuperAdminAssign.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllAssignments,
  fetchAssignmentById,
  fetchAssignmentStats,
  fetchStations,
  clearSuperAdminError,
  clearActiveAssignment,
  type SuperAdminAssignment,
} from '../../store/slices/superAdminSlice';
import type { AppDispatch, RootState } from '../../store/store';
import {
  X,
  Loader2,
  Eye,
  BarChart2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────

interface Filters {
  station_id: string;
  status: string;
}

interface AssignmentCardProps {
  assignment: SuperAdminAssignment;
  onView: () => void;
}

interface ViewDetailsModalProps {
  isOpen: boolean;
  assignment: SuperAdminAssignment | null;
  isLoading: boolean;
  onClose: () => void;
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  icon: React.ReactNode;
}

const STATUS_CONFIG: { [key in SuperAdminAssignment['status']]: StatusConfig } = {
  pending: {
    label: 'Pending',
    bg: '#fef9c3',
    text: '#854d0e',
    icon: <Clock size={12} />,
  },
  in_progress: {
    label: 'In Progress',
    bg: '#dbeafe',
    text: '#1e40af',
    icon: <AlertCircle size={12} />,
  },
  submitted: {
    label: 'Submitted',
    bg: '#dcfce7',
    text: '#166534',
    icon: <CheckCircle2 size={12} />,
  },
};

const formatDate = (dateStr?: string) =>
  dateStr ? new Date(dateStr).toLocaleString() : 'N/A';

// ─── Answer Renderer (Readable Tables) ─────────────────────────────────

// Answer Viewer (Readable Tables) – corrected with no any
const AnswerViewer: React.FC<{ answers: Record<string, unknown> }> = ({ answers }) => {
  if (!answers || Object.keys(answers).length === 0) {
    return <p className="text-xs italic" style={{ color: '#a8c5a0' }}>No answers provided.</p>;
  }

  type RowData = Record<string, unknown>;

  const isSimple = (val: unknown): boolean =>
    typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';

  const renderSimple = (key: string, value: unknown) => (
    <div key={key} className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-[#f0e8d6] last:border-0">
      <span className="text-xs font-medium w-1/3 text-[#1a3d1c]">{key}</span>
      <span className="text-sm text-[#1c1c1c] break-words">{String(value)}</span>
    </div>
  );

  const renderObject = (key: string, obj: Record<string, unknown>) => (
    <div key={key} className="mb-3">
      <div className="text-xs font-semibold text-[#c9a84c] mb-1">{key}</div>
      <div className="rounded-md overflow-hidden border border-[#d6c9a8] bg-white">
        <div className="divide-y divide-[#f0e8d6]">
          {Object.entries(obj).map(([k, v]) => (
            <div key={k} className="flex flex-col sm:flex-row sm:items-center px-3 py-2">
              <span className="text-xs font-medium w-1/3 text-[#1a3d1c]">{k}</span>
              <span className="text-sm text-[#1c1c1c]">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderArray = (key: string, arr: unknown[]) => {
    if (arr.length === 0) return null;
    const sample = arr[0];
    if (typeof sample !== 'object' || sample === null) {
      return (
        <div key={key} className="mb-3">
          <div className="text-xs font-semibold text-[#c9a84c] mb-1">{key}</div>
          <div className="text-sm text-[#1c1c1c] bg-white p-2 rounded border border-[#d6c9a8]">
            {arr.map((v, i) => (
              <span key={i}>{String(v)}{i < arr.length - 1 ? ', ' : ''}</span>
            ))}
          </div>
        </div>
      );
    }
    const keys = Object.keys(sample as RowData);
    return (
      <div key={key} className="mb-3">
        <div className="text-xs font-semibold text-[#c9a84c] mb-1">{key}</div>
        <div className="overflow-x-auto rounded border border-[#d6c9a8]">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#1a3d1c]">
                {keys.map((k) => (
                  <th key={k} className="px-3 py-2 text-left text-[#c9a84c] font-semibold border-r border-[#2c5f2e] last:border-r-0">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {arr.map((row, idx) => {
                const rowData = row as RowData;
                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fdf8f0]'} style={{ borderTop: '1px solid #d6c9a8' }}>
                    {keys.map((k) => (
                      <td key={k} className="px-3 py-2 text-[#1c1c1c] border-r border-[#d6c9a8] last:border-r-0">
                        {String(rowData[k] ?? '—')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const simpleEntries: [string, unknown][] = [];
  const complexEntries: [string, unknown][] = [];

  Object.entries(answers).forEach(([k, v]) => {
    if (isSimple(v)) {
      simpleEntries.push([k, v]);
    } else if (Array.isArray(v)) {
      complexEntries.push([k, v]);
    } else if (v && typeof v === 'object') {
      complexEntries.push([k, v]);
    } else {
      simpleEntries.push([k, v]);
    }
  });

  return (
    <div className="space-y-4">
      {simpleEntries.length > 0 && (
        <div className="rounded-lg overflow-hidden border border-[#d6c9a8] bg-white">
          <div className="px-3 py-2 bg-[#1a3d1c]">
            <span className="text-xs font-semibold text-[#fdf8f0]">Answers</span>
          </div>
          <div className="divide-y divide-[#f0e8d6]">
            {simpleEntries.map(([k, v]) => renderSimple(k, v))}
          </div>
        </div>
      )}
      {complexEntries.map(([k, v]) => {
        if (Array.isArray(v)) return renderArray(k, v);
        if (v && typeof v === 'object') return renderObject(k, v as Record<string, unknown>);
        return null;
      })}
    </div>
  );
};

// ─── Assignment Card ─────────────────────────────────────────────────────

const AssignmentCard: React.FC<AssignmentCardProps> = ({ assignment, onView }) => {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[assignment.status];

  return (
    <div
      className="rounded-xl overflow-hidden transition-all hover:shadow-md"
      style={{ border: '1.5px solid #d6c9a8', background: '#fff' }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold truncate" style={{ color: '#1a3d1c' }}>
                {assignment.component_name}
              </h3>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: status.bg, color: status.text }}
              >
                {status.icon}
                {status.label}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{assignment.component_section}</p>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="text-[#a8c5a0]">Inspector: </span>
                <span className="text-[#1a3d1c]">{assignment.user_full_name}</span>
              </div>
              <div>
                <span className="text-[#a8c5a0]">PJ No: </span>
                <span className="text-[#1a3d1c]">{assignment.user_pj_number}</span>
              </div>
              <div>
                <span className="text-[#a8c5a0]">Station: </span>
                <span className="text-[#1a3d1c]">{assignment.station_name} ({assignment.station_code})</span>
              </div>
              <div>
                <span className="text-[#a8c5a0]">Assigned: </span>
                <span className="text-[#1a3d1c]">{formatDate(assignment.assigned_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onView}
              className="p-1.5 rounded transition-colors"
              style={{ color: '#a8c5a0' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#c9a84c')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#a8c5a0')}
              title="View details"
              type="button"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded transition-colors"
              style={{ color: '#a8c5a0' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1a3d1c')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#a8c5a0')}
              type="button"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: '#f0e8d6' }}>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-[#a8c5a0]">Assigned by: </span>
                <span className="text-[#1a3d1c]">{assignment.assigned_by_name} ({assignment.assigned_by_email})</span>
              </div>
              <div>
                <span className="text-[#a8c5a0]">Inspector email: </span>
                <span className="text-[#1a3d1c]">{assignment.user_email}</span>
              </div>
              {assignment.submitted_at && (
                <div>
                  <span className="text-[#a8c5a0]">Submitted: </span>
                  <span className="text-[#1a3d1c]">{formatDate(assignment.submitted_at)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── View Details Modal (with readable answers) ──────────────────────────

const ViewDetailsModal: React.FC<ViewDetailsModalProps> = ({
  isOpen,
  assignment,
  isLoading,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ background: '#fdf8f0', border: '1.5px solid #d6c9a8' }}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: '#d6c9a8', background: '#1a3d1c' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#fdf8f0' }}>Assignment Details</h2>
          <button onClick={onClose} className="p-1 rounded transition-colors" style={{ color: '#a8c5a0' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fdf8f0')} onMouseLeave={(e) => (e.currentTarget.style.color = '#a8c5a0')} type="button">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading || !assignment ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: '#c9a84c' }} />
              <span className="ml-2 text-sm" style={{ color: '#6b7280' }}>Loading details...</span>
            </div>
          ) : (
            <>
              {/* Status */}
              <div className="flex justify-start">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                  style={{ background: STATUS_CONFIG[assignment.status].bg, color: STATUS_CONFIG[assignment.status].text }}
                >
                  {STATUS_CONFIG[assignment.status].icon}
                  {STATUS_CONFIG[assignment.status].label}
                </span>
              </div>

              {/* Component */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#a8c5a0' }}>Component</p>
                <div className="rounded-lg p-3" style={{ background: '#fff', border: '1px solid #d6c9a8' }}>
                  <p className="text-sm font-medium" style={{ color: '#1a3d1c' }}>{assignment.component_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{assignment.component_section}</p>
                </div>
              </section>

              {/* Inspector */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#a8c5a0' }}>Inspector</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg p-3" style={{ background: '#fff', border: '1px solid #d6c9a8' }}>
                  <div>
                    <p className="text-xs text-[#a8c5a0]">Name</p>
                    <p className="text-sm text-[#1a3d1c]">{assignment.user_full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#a8c5a0]">PJ Number</p>
                    <p className="text-sm text-[#1a3d1c]">{assignment.user_pj_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#a8c5a0]">Email</p>
                    <p className="text-sm text-[#1a3d1c] break-all">{assignment.user_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#a8c5a0]">Station</p>
                    <p className="text-sm text-[#1a3d1c]">{assignment.station_name} ({assignment.station_code})</p>
                  </div>
                </div>
              </section>

              {/* Assignment Info */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#a8c5a0' }}>Assignment Info</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg p-3" style={{ background: '#fff', border: '1px solid #d6c9a8' }}>
                  <div>
                    <p className="text-xs text-[#a8c5a0]">Assigned By</p>
                    <p className="text-sm text-[#1a3d1c]">{assignment.assigned_by_name}</p>
                    <p className="text-xs text-[#6b7280]">{assignment.assigned_by_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#a8c5a0]">Assigned At</p>
                    <p className="text-sm text-[#1a3d1c]">{formatDate(assignment.assigned_at)}</p>
                  </div>
                  {assignment.submitted_at && (
                    <div>
                      <p className="text-xs text-[#a8c5a0]">Submitted At</p>
                      <p className="text-sm text-[#1a3d1c]">{formatDate(assignment.submitted_at)}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Submitted Answers */}
              {assignment.answers && Object.keys(assignment.answers).length > 0 && (
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#a8c5a0' }}>Submitted Answers</p>
                  <AnswerViewer answers={assignment.answers} />
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Stats Modal ─────────────────────────────────────────────────────────

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose }) => {
  const { assignmentStats, isLoading } = useSelector((state: RootState) => state.superAdmin);

  if (!isOpen) return null;

  const overview = assignmentStats?.overview;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{ background: '#fdf8f0', border: '1.5px solid #d6c9a8' }}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: '#d6c9a8', background: '#1a3d1c' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#fdf8f0' }}>Assignment Statistics</h2>
          <button onClick={onClose} className="p-1 rounded transition-colors" style={{ color: '#a8c5a0' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fdf8f0')} onMouseLeave={(e) => (e.currentTarget.style.color = '#a8c5a0')} type="button">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading || !assignmentStats ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: '#c9a84c' }} />
              <span className="ml-2 text-sm" style={{ color: '#6b7280' }}>Loading stats...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: 'Total', value: overview?.total_assignments, color: '#3b82f6' },
                  { label: 'Pending', value: overview?.pending, color: '#eab308' },
                  { label: 'In Progress', value: overview?.in_progress, color: '#6366f1' },
                  { label: 'Submitted', value: overview?.submitted, color: '#22c55e' },
                  { label: 'Stations', value: overview?.stations_with_assignments, color: '#f97316' },
                  { label: 'Inspectors', value: overview?.unique_inspectors, color: '#8b5cf6' },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="rounded-xl p-4 text-center"
                    style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}
                  >
                    <p className="text-2xl font-bold" style={{ color }}>{value ?? '—'}</p>
                    <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* By Station */}
              {assignmentStats.byStation.length > 0 && (
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#a8c5a0' }}>By Station</p>
                  <div className="overflow-x-auto rounded-xl" style={{ border: '1.5px solid #d6c9a8' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: '#1a3d1c' }}>
                          {['Station', 'Total', 'Pending', 'In Progress', 'Submitted'].map((h) => (
                            <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: '#c9a84c' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentStats.byStation.map((s, idx) => (
                          <tr
                            key={s.id}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fdf8f0]'}
                            style={{ borderTop: '1px solid #f0e8d6' }}
                          >
                            <td className="px-4 py-2 font-medium" style={{ color: '#1a3d1c' }}>
                              {s.name}
                              <span className="ml-1 text-xs" style={{ color: '#a8c5a0' }}>({s.code})</span>
                            </td>
                            <td className="px-4 py-2" style={{ color: '#1c1c1c' }}>{s.total_assignments}</td>
                            <td className="px-4 py-2" style={{ color: '#eab308' }}>{s.pending}</td>
                            <td className="px-4 py-2" style={{ color: '#6366f1' }}>{s.in_progress}</td>
                            <td className="px-4 py-2" style={{ color: '#22c55e' }}>{s.submitted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────

const SuperAdminAssign: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { allAssignments, activeAssignment, stations, isLoading, error } = useSelector(
    (state: RootState) => state.superAdmin
  );

  const [filters, setFilters] = useState<Filters>({ station_id: '', status: '' });
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchStations());
    dispatch(fetchAllAssignments({}));
  }, [dispatch]);

  const handleFilter = useCallback(() => {
    dispatch(
      fetchAllAssignments({
        station_id: filters.station_id ? Number(filters.station_id) : undefined,
        status: filters.status || undefined,
      })
    );
  }, [dispatch, filters]);

  const handleClearFilters = useCallback(() => {
    setFilters({ station_id: '', status: '' });
    dispatch(fetchAllAssignments({}));
  }, [dispatch]);

  const handleViewAssignment = useCallback(
    (id: number) => {
      dispatch(fetchAssignmentById(id));
      setIsViewModalOpen(true);
    },
    [dispatch]
  );

  const handleOpenStats = useCallback(() => {
    dispatch(fetchAssignmentStats());
    setIsStatsModalOpen(true);
  }, [dispatch]);

  const handleCloseView = useCallback(() => {
    setIsViewModalOpen(false);
    dispatch(clearActiveAssignment());
  }, [dispatch]);

  const counts = allAssignments.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (isLoading && allAssignments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin" style={{ color: '#c9a84c' }} />
        <span className="ml-2 text-sm" style={{ color: '#6b7280' }}>Loading assignments...</span>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6" style={{ background: '#fdf8f0', minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#1a3d1c' }}>Assignments</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>View all inspection assignments across all stations</p>
        </div>
        <button
          onClick={handleOpenStats}
          className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors w-full sm:w-auto"
          style={{ background: '#1a3d1c', color: '#fdf8f0' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2d6a4f')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1a3d1c')}
          type="button"
        >
          <BarChart2 size={16} className="mr-2" />
          View Stats
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 rounded-lg flex justify-between items-center" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <span className="text-sm" style={{ color: '#b91c1c' }}>{error}</span>
          <button onClick={() => dispatch(clearSuperAdminError())} type="button">
            <X size={16} style={{ color: '#b91c1c' }} />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: allAssignments.length, icon: <ClipboardList size={16} />, color: '#3b82f6' },
          { label: 'Pending', value: counts.pending ?? 0, icon: <Clock size={16} />, color: '#eab308' },
          { label: 'In Progress', value: counts.in_progress ?? 0, icon: <AlertCircle size={16} />, color: '#6366f1' },
          { label: 'Submitted', value: counts.submitted ?? 0, icon: <CheckCircle2 size={16} />, color: '#22c55e' },
        ].map(({ label, value, icon, color }) => (
          <div
            key={label}
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}
          >
            <span style={{ color }}>{icon}</span>
            <div>
              <p className="text-xl font-bold" style={{ color: '#1a3d1c' }}>{value}</p>
              <p className="text-xs" style={{ color: '#a8c5a0' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="mb-5 p-4 rounded-xl flex flex-wrap items-end gap-3"
        style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}
      >
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#1a3d1c' }}>Station</label>
          <select
            value={filters.station_id}
            onChange={(e) => setFilters((prev) => ({ ...prev, station_id: e.target.value }))}
            className="px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c', minWidth: '160px' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
          >
            <option value="">All Stations</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#1a3d1c' }}>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c', minWidth: '140px' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted</option>
          </select>
        </div>

        <div className="flex gap-2 mt-2 sm:mt-0">
          <button
            onClick={handleFilter}
            className="px-4 py-2 rounded-md text-sm transition-colors"
            style={{ background: '#1a3d1c', color: '#fdf8f0' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#2d6a4f')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#1a3d1c')}
            type="button"
          >
            Apply
          </button>
          {(filters.station_id || filters.status) && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-md text-sm transition-colors"
              style={{ background: '#f0e8d6', color: '#6b7280' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#e6ddc8')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#f0e8d6')}
              type="button"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Assignment List */}
      {allAssignments.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}>
          <p className="text-sm" style={{ color: '#6b7280' }}>No assignments found.</p>
          <p className="text-xs mt-1" style={{ color: '#a8c5a0' }}>Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {allAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onView={() => handleViewAssignment(assignment.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ViewDetailsModal
        isOpen={isViewModalOpen}
        assignment={activeAssignment}
        isLoading={isLoading}
        onClose={handleCloseView}
      />

      <StatsModal isOpen={isStatsModalOpen} onClose={() => setIsStatsModalOpen(false)} />
    </div>
  );
};

export default SuperAdminAssign;