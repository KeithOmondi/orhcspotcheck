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

// ─── Assignment Card ─────────────────────────────────────────────────────

const AssignmentCard: React.FC<AssignmentCardProps> = ({ assignment, onView }) => {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[assignment.status];

  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{
        border: '1px solid #e2e8f0',
        background: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
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
            <p className="text-xs text-gray-500 mt-0.5">{assignment.component_section}</p>

            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
              <span>
                <span className="text-gray-400">Inspector: </span>
                {assignment.user_full_name}
              </span>
              <span>
                <span className="text-gray-400">PJ No: </span>
                {assignment.user_pj_number}
              </span>
              <span>
                <span className="text-gray-400">Station: </span>
                {assignment.station_name} ({assignment.station_code})
              </span>
              <span>
                <span className="text-gray-400">Assigned: </span>
                {formatDate(assignment.assigned_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onView}
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
              title="View details"
              type="button"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
              type="button"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-xs text-gray-600">
            <p>
              <span className="text-gray-400">Assigned by: </span>
              {assignment.assigned_by_name} ({assignment.assigned_by_email})
            </p>
            <p>
              <span className="text-gray-400">Inspector email: </span>
              {assignment.user_email}
            </p>
            {assignment.submitted_at && (
              <p>
                <span className="text-gray-400">Submitted: </span>
                {formatDate(assignment.submitted_at)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── View Details Modal ──────────────────────────────────────────────────

const ViewDetailsModal: React.FC<ViewDetailsModalProps> = ({
  isOpen,
  assignment,
  isLoading,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{ background: '#ffffff' }}
      >
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: '#e2e8f0' }}
        >
          <h2 className="text-xl font-semibold text-gray-900">Assignment Details</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading || !assignment ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-blue-600" />
              <span className="ml-2 text-gray-500">Loading details...</span>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    background: STATUS_CONFIG[assignment.status].bg,
                    color: STATUS_CONFIG[assignment.status].text,
                  }}
                >
                  {STATUS_CONFIG[assignment.status].icon}
                  {STATUS_CONFIG[assignment.status].label}
                </span>
              </div>

              {/* Component */}
              <section>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Component
                </p>
                <p className="text-sm font-medium text-gray-900">{assignment.component_name}</p>
                <p className="text-xs text-gray-500">{assignment.component_section}</p>
              </section>

              {/* Inspector */}
              <section>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Inspector
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Name</p>
                    <p className="text-gray-800">{assignment.user_full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">PJ Number</p>
                    <p className="text-gray-800">{assignment.user_pj_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-gray-800">{assignment.user_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Station</p>
                    <p className="text-gray-800">
                      {assignment.station_name} ({assignment.station_code})
                    </p>
                  </div>
                </div>
              </section>

              {/* Assignment Info */}
              <section>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Assignment Info
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Assigned By</p>
                    <p className="text-gray-800">{assignment.assigned_by_name}</p>
                    <p className="text-xs text-gray-500">{assignment.assigned_by_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Assigned At</p>
                    <p className="text-gray-800">{formatDate(assignment.assigned_at)}</p>
                  </div>
                  {assignment.submitted_at && (
                    <div>
                      <p className="text-xs text-gray-400">Submitted At</p>
                      <p className="text-gray-800">{formatDate(assignment.submitted_at)}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Answers */}
              {assignment.answers && Object.keys(assignment.answers).length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Submitted Answers
                  </p>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(assignment.answers, null, 2)}
                  </pre>
                </section>
              )}
            </div>
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
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{ background: '#ffffff' }}
      >
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: '#e2e8f0' }}
        >
          <h2 className="text-xl font-semibold text-gray-900">Assignment Statistics</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading || !assignmentStats ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-blue-600" />
              <span className="ml-2 text-gray-500">Loading stats...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                    className="rounded-lg p-4 text-center"
                    style={{ background: '#f9fafb', border: '1px solid #e2e8f0' }}
                  >
                    <p className="text-2xl font-bold" style={{ color }}>
                      {value ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* By Station */}
              {assignmentStats.byStation.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    By Station
                  </p>
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e2e8f0' }}>
                          {['Station', 'Total', 'Pending', 'In Progress', 'Submitted'].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-2 text-left text-xs font-semibold text-gray-500"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentStats.byStation.map((s) => (
                          <tr
                            key={s.id}
                            className="border-t"
                            style={{ borderColor: '#f1f5f9' }}
                          >
                            <td className="px-4 py-2 font-medium text-gray-800">
                              {s.name}
                              <span className="ml-1 text-xs text-gray-400">({s.code})</span>
                            </td>
                            <td className="px-4 py-2 text-gray-700">{s.total_assignments}</td>
                            <td className="px-4 py-2 text-yellow-600">{s.pending}</td>
                            <td className="px-4 py-2 text-blue-600">{s.in_progress}</td>
                            <td className="px-4 py-2 text-green-600">{s.submitted}</td>
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

  // ── Derived counts ───────────────────────────────────────────────────
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
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading assignments...</span>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ background: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">
            View all inspection assignments across all stations
          </p>
        </div>
        <button
          onClick={handleOpenStats}
          className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{ background: '#e0e7ff', color: '#3730a3' }}
          type="button"
        >
          <BarChart2 size={16} className="mr-2" />
          View Stats
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
          <span className="text-red-700 text-sm">{error}</span>
          <button
            onClick={() => dispatch(clearSuperAdminError())}
            className="text-red-700"
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Summary Strip */}
      <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: allAssignments.length, icon: <ClipboardList size={16} />, color: '#3b82f6' },
          { label: 'Pending', value: counts.pending ?? 0, icon: <Clock size={16} />, color: '#eab308' },
          { label: 'In Progress', value: counts.in_progress ?? 0, icon: <AlertCircle size={16} />, color: '#6366f1' },
          { label: 'Submitted', value: counts.submitted ?? 0, icon: <CheckCircle2 size={16} />, color: '#22c55e' },
        ].map(({ label, value, icon, color }) => (
          <div
            key={label}
            className="rounded-lg p-4 flex items-center gap-3"
            style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
          >
            <span style={{ color }}>{icon}</span>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="mb-5 p-4 rounded-lg flex flex-wrap items-end gap-3"
        style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
      >
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Station</label>
          <select
            value={filters.station_id}
            onChange={(e) => setFilters((prev) => ({ ...prev, station_id: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: '#d1d5db', background: '#ffffff', minWidth: '160px' }}
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
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: '#d1d5db', background: '#ffffff', minWidth: '140px' }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
            type="button"
          >
            Apply
          </button>
          {(filters.station_id || filters.status) && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-md text-sm transition-colors"
              style={{ background: '#f1f5f9', color: '#475569' }}
              type="button"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Assignment List */}
      {allAssignments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No assignments found.</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters.</p>
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