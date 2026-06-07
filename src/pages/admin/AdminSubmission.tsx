// src/pages/admin/AdminSubmissions.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSubmissions,
  fetchSubmissionById,
  clearActiveSubmission,
  clearSubmissionError,
  clearSubmissions,
  type Submission,
  type SubmissionDetail,
} from '../../store/slices/submissionSlice';
import type { AppDispatch, RootState } from '../../store/store';
import {
  FileCheck2, Search, X, Calendar, User, Clock,
  ClipboardList, Filter, Eye, Loader2, AlertCircle,
  CheckCircle2, ChevronRight, CheckSquare, Square,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType =
  | 'text' | 'textarea' | 'number' | 'date' | 'select'
  | 'checkbox' | 'radio' | 'matrix' | 'table' | 'challenge_table';

interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  columns?: string[];
  rows?: MatrixRowDef[];
}

interface MatrixRowDef {
  name: string;
  isSectionHeader?: boolean;
  indent?: number;
  parentSection?: string;
}

interface MatrixRowValue {
  type: 'section' | 'row';
  label: string;
  isSectionHeader: boolean;
  indent?: number;
  values?: Record<string, string>;
}

interface ChallengeRow {
  challenge?: string;
  recommendation?: string;
  [key: string]: string | undefined;
}

type AnswerPrimitive = string | number | boolean | null;
type AnswerValue     = AnswerPrimitive | Record<string, unknown> | unknown[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtFull = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── Field Renderers ──────────────────────────────────────────────────────────

const MatrixTable: React.FC<{ field: FormField; data: Record<string, MatrixRowValue> }> = ({ field, data }) => {
  const columns = field.columns ?? ['Register in use', 'Continuously updated', 'Reviewed/checked'];

  return (
    <div className="overflow-x-auto rounded" style={{ border: '1px solid #d6c9a8' }}>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ background: '#1a3d1c' }}>
            <th className="text-left px-3 py-2 font-semibold" style={{ color: '#c9a84c', borderRight: '1px solid #2c5f2e' }}>
              Case Register
            </th>
            {columns.map((col) => (
              <th key={col} className="text-center px-2 py-2 font-semibold last:border-r-0" style={{ color: '#c9a84c', borderRight: '1px solid #2c5f2e' }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.values(data).map((row, idx) => {
            if (row.isSectionHeader) {
              return (
                <tr key={idx} style={{ background: '#f0f4f0' }}>
                  <td
                    colSpan={columns.length + 1}
                    className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: '#1a3d1c', borderTop: '1px solid #d6c9a8' }}
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }

            const indent = row.indent ?? 0;
            return (
              <tr
                key={idx}
                className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fdf8f0]'}`}
                style={{ borderColor: '#d6c9a8' }}
              >
                <td
                  className="px-3 py-2"
                  style={{ paddingLeft: `${12 + indent * 16}px`, color: '#1a3d1c', borderRight: '1px solid #d6c9a8' }}
                >
                  {row.label}
                </td>
                {columns.map((_, colIdx) => {
                  const val = row.values?.[`col${colIdx}`] ?? '';
                  const isEmpty = !val || val.trim() === '';
                  return (
                    <td key={colIdx} className="px-2 py-2 text-center last:border-r-0" style={{ borderRight: '1px solid #d6c9a8' }}>
                      {isEmpty ? (
                        <span style={{ color: '#a8c5a0' }}>—</span>
                      ) : (
                        <span style={{ color: '#1c1c1c' }}>{val}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const ChallengeTable: React.FC<{ data: ChallengeRow[] }> = ({ data }) => {
  if (!data.length) return <p className="text-xs italic" style={{ color: '#a8c5a0' }}>No entries</p>;

  const keys = Object.keys(data[0]);
  return (
    <div className="overflow-x-auto rounded" style={{ border: '1px solid #d6c9a8' }}>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ background: '#1a3d1c' }}>
            {keys.map((k) => (
              <th key={k} className="text-left px-3 py-2 font-semibold capitalize last:border-r-0" style={{ color: '#c9a84c', borderRight: '1px solid #2c5f2e' }}>
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={`border-t ${i % 2 === 0 ? 'bg-white' : 'bg-[#fdf8f0]'}`} style={{ borderColor: '#d6c9a8' }}>
              {keys.map((k) => (
                <td key={k} className="px-3 py-2 last:border-r-0" style={{ color: '#1c1c1c', borderRight: '1px solid #d6c9a8' }}>
                  {row[k] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const renderAnswer = (field: FormField, answer: AnswerValue): React.ReactNode => {
  // Empty
  if (answer === null || answer === undefined || answer === '') {
    return <p className="text-xs italic" style={{ color: '#a8c5a0' }}>No answer provided</p>;
  }

  // Matrix — render as table
  if (field.type === 'matrix' && typeof answer === 'object' && !Array.isArray(answer)) {
    return <MatrixTable field={field} data={answer as Record<string, MatrixRowValue>} />;
  }

  // Challenge / regular table — render as table
  if ((field.type === 'challenge_table' || field.type === 'table') && Array.isArray(answer)) {
    return <ChallengeTable data={answer as ChallengeRow[]} />;
  }

  // Boolean-like Yes/No
  if (typeof answer === 'boolean' || answer === 'true' || answer === 'false') {
    const isYes = answer === true || answer === 'true';
    return (
      <div className="flex items-center gap-1.5">
        {isYes
          ? <CheckSquare size={14} className="text-[#10b981]" />
          : <Square size={14} style={{ color: '#a8c5a0' }} />
        }
        <span className={`text-sm font-medium ${isYes ? 'text-[#10b981]' : ''}`} style={{ color: isYes ? '#10b981' : '#6b7280' }}>
          {isYes ? 'Yes' : 'No'}
        </span>
      </div>
    );
  }

  // Yes / No string answers
  if (answer === 'Yes' || answer === 'No') {
    const isYes = answer === 'Yes';
    return (
      <div className="flex items-center gap-1.5">
        {isYes
          ? <CheckSquare size={14} className="text-[#10b981]" />
          : <Square size={14} style={{ color: '#a8c5a0' }} />
        }
        <span className={`text-sm font-medium ${isYes ? 'text-[#10b981]' : ''}`} style={{ color: isYes ? '#10b981' : '#6b7280' }}>
          {answer}
        </span>
      </div>
    );
  }

  // Plain text / textarea / number / date
  return <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#1c1c1c' }}>{String(answer)}</p>;
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────

const DetailDrawer: React.FC<{
  submission: SubmissionDetail | null;
  isLoading: boolean;
  onClose: () => void;
}> = ({ submission, isLoading, onClose }) => {
  const isOpen = isLoading || !!submission;
  const fields  = (submission?.form_json?.fields ?? []) as FormField[];
  const answers = (submission?.answers ?? {}) as Record<string, AnswerValue>;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-all duration-300 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-2xl flex flex-col
          transition-transform duration-300 ease-in-out shadow-2xl
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: '#fdf8f0', borderLeft: '2px solid #2c5f2e' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ background: '#1a3d1c' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <FileCheck2 size={15} style={{ color: '#c9a84c' }} />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight" style={{ color: '#fdf8f0' }}>
                {submission?.component_name ?? 'Submission Detail'}
              </p>
              {submission?.component_section && (
                <p className="text-[11px] mt-0.5 leading-none" style={{ color: '#a8c5a0' }}>{submission.component_section}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors">
            <X size={15} style={{ color: '#a8c5a0' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ background: '#fdf8f0' }}>
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Loader2 size={22} className="animate-spin" style={{ color: '#c9a84c' }} />
              <p className="text-sm" style={{ color: '#a8c5a0' }}>Loading submission…</p>
            </div>
          )}

          {!isLoading && submission && (
            <>
              {/* Meta */}
              <div className="p-4 border-b" style={{ background: '#fff', borderColor: '#d6c9a8' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(
                    [
                      { icon: User,         label: 'Inspector',    name: submission.inspector_name,   email: submission.inspector_email,   badge: null },
                      { icon: ChevronRight, label: 'Assigned by',  name: submission.assigned_by_name, email: submission.assigned_by_email, badge: null },
                    ] satisfies { icon: React.ElementType; label: string; name: string; email: string; badge: null }[]
                  ).map(({ icon: Icon, label, name, email }) => (
                    <div key={label} className="p-3 rounded-lg" style={{ border: '1px solid #d6c9a8', background: '#fdf8f0' }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon size={11} style={{ color: '#c9a84c' }} />
                        <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#a8c5a0' }}>{label}</p>
                      </div>
                      <p className="text-sm font-semibold leading-tight" style={{ color: '#1a3d1c' }}>{name}</p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: '#6b7280' }}>{email}</p>
                    </div>
                  ))}

                  <div className="p-3 rounded-lg" style={{ border: '1px solid #d6c9a8', background: '#fdf8f0' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Calendar size={11} style={{ color: '#c9a84c' }} />
                      <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#a8c5a0' }}>Submitted</p>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#1a3d1c' }}>{fmtFull(submission.submitted_at)}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: '#10b981/10', color: '#10b981', border: '1px solid #10b981/20' }}>
                      SUBMITTED
                    </span>
                  </div>

                  <div className="p-3 rounded-lg" style={{ border: '1px solid #d6c9a8', background: '#fdf8f0' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock size={11} style={{ color: '#c9a84c' }} />
                      <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#a8c5a0' }}>Last Updated</p>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#1a3d1c' }}>{fmtFull(submission.updated_at)}</p>
                  </div>
                </div>
              </div>

              {/* Form responses */}
              {fields.length > 0 && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: '#a8c5a0' }}>Form Responses</p>
                    <div className="flex-1 h-px" style={{ background: '#d6c9a8' }} />
                    <span className="text-[10px]" style={{ color: '#a8c5a0' }}>{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
                  </div>

                  {fields.map((field, idx) => {
                    const answer = answers[field.id] ?? null;
                    const isEmpty = answer === null || answer === undefined || answer === '';
                    const isMatrix = field.type === 'matrix' || field.type === 'table' || field.type === 'challenge_table';

                    return (
                      <div
                        key={field.id}
                        className="rounded-lg overflow-hidden"
                        style={{ border: '1px solid #d6c9a8', background: '#fff' }}
                      >
                        {/* Label bar */}
                        <div className="flex items-start gap-2 px-3 py-2 border-b" style={{ background: '#fdf8f0', borderColor: '#d6c9a8' }}>
                          <span className="text-[10px] font-bold mt-0.5" style={{ color: '#a8c5a0' }}>{idx + 1}.</span>
                          <p className="text-[11px] font-medium flex-1 leading-snug" style={{ color: '#1a3d1c' }}>
                            {field.label}
                            {field.required && <span className="text-red-400 ml-0.5">*</span>}
                          </p>
                        </div>

                        {/* Answer */}
                        <div className={`${isMatrix ? 'p-0' : 'px-3 py-2.5'} ${isEmpty ? 'opacity-60' : ''}`}>
                          {renderAnswer(field, answer)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {submission && (
          <div className="px-5 py-3 border-t flex-shrink-0" style={{ background: '#1a3d1c', borderColor: '#2c5f2e' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} style={{ color: '#10b981' }} />
              <span className="text-xs" style={{ color: '#a8c5a0' }}>Submitted {fmtFull(submission.submitted_at)}</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

// ─── Card View (Mobile) ───────────────────────────────────────────────────────

const SubmissionCard: React.FC<{ submission: Submission; onOpen: (id: number) => void }> = ({ submission, onOpen }) => (
  <div
    className="rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
    style={{ background: '#fff', border: '1.5px solid #d6c9a8' }}
    onClick={() => onOpen(submission.id)}
  >
    <div className="flex justify-between items-start mb-3">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate" style={{ color: '#1a3d1c' }}>{submission.component_name}</h3>
        <p className="text-xs mt-0.5 truncate" style={{ color: '#6b7280' }}>{submission.component_section}</p>
      </div>
      <Eye size={14} style={{ color: '#c9a84c' }} />
    </div>
    <div className="flex items-center gap-2 mb-2">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: '#1a3d1c', color: '#c9a84c' }}>
        {submission.inspector_name?.charAt(0).toUpperCase() ?? '?'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate" style={{ color: '#1a3d1c' }}>{submission.inspector_name}</p>
        <p className="text-[11px] truncate" style={{ color: '#a8c5a0' }}>{submission.inspector_email}</p>
      </div>
    </div>
    <div className="flex items-center gap-1.5 mt-2">
      <Calendar size={12} style={{ color: '#a8c5a0' }} />
      <span className="text-xs" style={{ color: '#6b7280' }}>{fmt(submission.submitted_at)}</span>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminSubmissions: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { submissions, count, isLoading, isLoadingDetail, error, activeSubmission } =
    useSelector((state: RootState) => state.submission);

  const [search, setSearch]               = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  const sections = useMemo(
    () => Array.from(new Set(submissions.map((s) => s.component_section))).sort(),
    [submissions]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return submissions.filter((s) => {
      const matchSearch =
        !q ||
        s.component_name.toLowerCase().includes(q) ||
        s.inspector_name.toLowerCase().includes(q) ||
        s.inspector_email.toLowerCase().includes(q) ||
        s.component_section.toLowerCase().includes(q);
      const matchSection = !sectionFilter || s.component_section === sectionFilter;
      return matchSearch && matchSection;
    });
  }, [submissions, search, sectionFilter]);

  useEffect(() => {
    dispatch(fetchSubmissions({}));
    return () => { dispatch(clearSubmissions()); dispatch(clearSubmissionError()); };
  }, [dispatch]);

  return (
    <div className="w-full p-4 sm:p-6" style={{ background: '#fdf8f0' }}>
      <div className="space-y-5 max-w-full">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-2" style={{ color: '#1a3d1c' }}>
            <FileCheck2 size={18} style={{ color: '#c9a84c' }} />
            Submissions
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#a8c5a0' }}>
            {count} total submitted inspection{count !== 1 ? 's' : ''}
          </p>
        </div>

        {error && (
          <div className="flex items-center justify-between p-3 rounded-md" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <div className="flex items-center gap-2">
              <AlertCircle size={14} style={{ color: '#b91c1c' }} />
              <span className="text-sm" style={{ color: '#b91c1c' }}>{error}</span>
            </div>
            <button onClick={() => dispatch(clearSubmissionError())}><X size={14} style={{ color: '#b91c1c' }} /></button>
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8c5a0' }} />
            <input
              type="text"
              placeholder="Search by component, inspector, section…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 text-sm rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X size={13} style={{ color: '#a8c5a0' }} />
              </button>
            )}
          </div>
          {sections.length > 0 && (
            <div className="relative">
              <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#a8c5a0' }} />
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="h-9 pl-7 pr-8 text-sm rounded-md focus:outline-none focus:ring-2 appearance-none cursor-pointer transition-colors"
                style={{ border: '1.5px solid #d6c9a8', background: '#fff', color: '#1c1c1c' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#c9a84c')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d6c9a8')}
              >
                <option value="">All sections</option>
                {sections.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Submissions List */}
        <div className="rounded-lg overflow-hidden" style={{ border: '1.5px solid #d6c9a8', background: '#fff' }}>
          {/* Desktop Table Header */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b" style={{ background: '#1a3d1c', borderColor: '#2c5f2e' }}>
            {(['Component', 'Inspector', 'Submitted', ''] as const).map((h) => (
              <p key={h} className="text-[11px] uppercase tracking-widest font-medium" style={{ color: '#c9a84c' }}>{h}</p>
            ))}
          </div>

          {isLoading && (
            <div className="divide-y" style={{ borderColor: '#d6c9a8' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-3.5 animate-pulse">
                  <div className="h-4 w-3/4 rounded" style={{ background: '#f0e8d6' }} />
                  <div className="h-4 w-1/2 rounded" style={{ background: '#f0e8d6' }} />
                  <div className="h-4 w-1/3 rounded" style={{ background: '#f0e8d6' }} />
                  <div className="h-4 w-6 rounded" style={{ background: '#f0e8d6' }} />
                </div>
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <ClipboardList size={28} style={{ color: '#a8c5a0' }} />
              <p className="text-sm font-medium" style={{ color: '#6b7280' }}>No submissions found</p>
              <p className="text-xs" style={{ color: '#a8c5a0' }}>
                {search || sectionFilter ? 'Try adjusting your filters' : 'Submitted inspections will appear here'}
              </p>
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <>
              {/* Desktop rows */}
              <div className="hidden md:block divide-y" style={{ borderColor: '#d6c9a8' }}>
                {filtered.map((sub) => (
                  <SubmissionRow key={sub.id} submission={sub} onOpen={(id) => dispatch(fetchSubmissionById(id))} />
                ))}
              </div>

              {/* Mobile cards */}
              <div className="md:hidden p-3 space-y-3">
                {filtered.map((sub) => (
                  <SubmissionCard key={sub.id} submission={sub} onOpen={(id) => dispatch(fetchSubmissionById(id))} />
                ))}
              </div>
            </>
          )}
        </div>

        <DetailDrawer
          submission={activeSubmission}
          isLoading={isLoadingDetail}
          onClose={() => dispatch(clearActiveSubmission())}
        />
      </div>
    </div>
  );
};

// ─── Desktop Row Component (unchanged but with theme colors) ──────────────────
const SubmissionRow: React.FC<{ submission: Submission; onOpen: (id: number) => void }> = ({ submission, onOpen }) => (
  <button
    onClick={() => onOpen(submission.id)}
    className="w-full text-left grid md:grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-3.5 hover:bg-[#f0f9f5] transition-colors group"
  >
    <div className="min-w-0">
      <p className="text-sm font-medium truncate" style={{ color: '#1a3d1c' }}>{submission.component_name}</p>
      <p className="text-[11px] truncate mt-0.5" style={{ color: '#6b7280' }}>{submission.component_section}</p>
    </div>
    <div className="min-w-0 flex items-center gap-2">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: '#1a3d1c', color: '#c9a84c' }}>
        {submission.inspector_name?.charAt(0).toUpperCase() ?? '?'}
      </div>
      <div className="min-w-0">
        <p className="text-sm truncate" style={{ color: '#1a3d1c' }}>{submission.inspector_name}</p>
        <p className="text-[11px] truncate" style={{ color: '#6b7280' }}>{submission.inspector_email}</p>
      </div>
    </div>
    <div className="flex items-center gap-1.5">
      <Calendar size={12} style={{ color: '#a8c5a0' }} />
      <span className="text-sm" style={{ color: '#6b7280' }}>{fmt(submission.submitted_at)}</span>
    </div>
    <div className="flex items-center justify-end">
      <div className="w-7 h-7 rounded-md flex items-center justify-center border transition-colors group-hover:border-[#2c5f2e] group-hover:bg-[#1a3d1c]" style={{ borderColor: '#d6c9a8' }}>
        <Eye size={13} className="transition-colors group-hover:text-[#c9a84c]" style={{ color: '#a8c5a0' }} />
      </div>
    </div>
  </button>
);

export default AdminSubmissions;