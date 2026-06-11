// src/pages/user/UserAssignments.tsx
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchMyAssignments,
  fetchMyAssignmentById,
  saveAssignmentDraft,
  submitAssignment,
  getAssignmentSummary,
  clearUserAssignmentError,
  resetUserAssignmentSuccess,
  clearActiveAssignment,
  updateLocalAnswers,
  updateMatrixCell,
  initializeMatrixField,
  type UserAssignment,
  type UserAssignmentDetail,
  type FormField,
  type MatrixData,
  type MatrixRow,
} from '../../store/slices/userAssignmentSlice';
import type { AppDispatch, RootState } from '../../store/store';
import { Loader2, Save, CheckCircle, Clock, AlertCircle, ArrowLeft, ChevronRight, FileText } from 'lucide-react';
import { fetchMyStation } from '../../store/slices/userAssignmentSlice';

// ─── Spinner keyframe (injected once) ────────────────────────────────────────
const spinStyle = document.createElement('style');
spinStyle.textContent = `@keyframes _spin { to { transform: rotate(360deg); } }`;
if (!document.head.querySelector('[data-ua-spin]')) {
  spinStyle.setAttribute('data-ua-spin', '1');
  document.head.appendChild(spinStyle);
}
const spinning: React.CSSProperties = { animation: '_spin 0.8s linear infinite' };

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: 'text-amber-800',   bg: 'bg-amber-50',   icon: <Clock size={13} />        },
  in_progress: { label: 'In Progress', color: 'text-blue-800',    bg: 'bg-blue-50',    icon: <Save size={13} />         },
  submitted:   { label: 'Submitted',   color: 'text-emerald-800', bg: 'bg-emerald-50', icon: <CheckCircle size={13} /> },
} as const;

// ─── Field: section ───────────────────────────────────────────────────────────
const SectionField: React.FC<{ field: FormField }> = ({ field }) => {
  if (field.sectionStyle === 'band') {
    return (
      <div className="bg-[#1E4620] text-white font-serif font-bold text-xs tracking-wider uppercase px-4 py-2 mt-7 mb-4">
        {field.label}
      </div>
    );
  }
  return (
    <div className="border-b-2 border-[#A37F2B] pb-1 mb-3 mt-5 flex gap-1 items-baseline">
      {field.sectionNumber && (
        <span className="text-[#A37F2B] font-bold text-sm font-serif">{field.sectionNumber}.</span>
      )}
      <span className="text-[#1E4620] font-bold text-sm font-serif">{field.label}</span>
    </div>
  );
};

// ─── Field: yes_no ────────────────────────────────────────────────────────────
const YesNoField: React.FC<{
  field: FormField;
  value: unknown;
  answers: Record<string, unknown>;
  onChange: (id: string, v: unknown) => void;
  errors: Record<string, string>;
  disabled: boolean;
}> = ({ field, value, answers, onChange, errors, disabled }) => {
  const fuKey = `${field.id}_followup`;
  const fuVal = answers[fuKey] as string | undefined;
  const showFu = value === 'No' && !!field.followUpLabel;

  return (
    <div className="mb-4">
      <div className="flex items-start gap-3 flex-wrap">
        <span className="flex-1 text-sm text-[#1A1A1A] font-serif leading-relaxed">
          {field.label}
          {field.required && <span className="text-[#B91C1C] ml-1">*</span>}
        </span>
        <div className="flex gap-5 flex-shrink-0">
          {(['Yes', 'No'] as const).map(opt => (
            <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={value === opt}
                onChange={() => !disabled && onChange(field.id, value === opt ? null : opt)}
                className="w-3.5 h-3.5 accent-[#1E4620]"
              />
              <span className="text-sm font-serif">{opt}</span>
            </label>
          ))}
        </div>
      </div>
      {showFu && (
        <div className="mt-2 pl-3 border-l-3 border-[#A37F2B]">
          <div className="text-xs text-[#6B6253] mb-1 italic">{field.followUpLabel}</div>
          <textarea
            value={fuVal || ''}
            onChange={e => onChange(fuKey, e.target.value)}
            disabled={disabled}
            rows={2}
            className="w-full p-2 text-sm font-serif border border-[#D6CEBC] rounded focus:outline-none focus:ring-1 focus:ring-[#A37F2B] resize-vertical"
          />
        </div>
      )}
      {errors[field.id] && <p className="text-xs text-[#B91C1C] mt-1">{errors[field.id]}</p>}
    </div>
  );
};

// ─── Field: matrix ────────────────────────────────────────────────────────────
const MatrixField: React.FC<{
  field: FormField;
  value: MatrixData | null | undefined;
  onChange: (id: string, v: unknown) => void;
  onMatrixCellChange: (fieldId: string, rowKey: string, colIndex: number, value: string) => void;
  disabled: boolean;
}> = ({ field, value, onMatrixCellChange, disabled }) => {
  const matrixData = value || {};
  const columns = field.columns || [
    'Register in use (correct/improvised) – if improvised specify which register is in use and if customised',
    'Continuously updated',
    'Reviewed/checked for accuracy and completeness',
  ];

  if (!matrixData || Object.keys(matrixData).length === 0) {
    return (
      <div className="mb-4 p-5 text-center text-[#6B6253] italic">
        Matrix not initialized
      </div>
    );
  }

  const renderRow = (rowKey: string, row: MatrixRow) => {
    if (row.type === 'section') {
      return (
        <tr key={rowKey} className="bg-[#F5F0E8]">
          <td
            colSpan={row.colspan || columns.length + 1}
            className="border border-[#D6CEBC] p-1.5 font-bold text-[#1E4620] text-sm border-t-2 border-t-[#A37F2B] border-b-2 border-b-[#A37F2B]"
          >
            {row.label}
          </td>
        </tr>
      );
    }
    return (
      <tr key={rowKey}>
        <td
          className="border border-[#D6CEBC] p-1.5 align-top font-medium text-[#1A1A1A] whitespace-nowrap"
          style={{ paddingLeft: row.indent ? `${row.indent * 20 + 8}px` : '8px' }}
        >
          {row.label}
        </td>
        {[0, 1, 2].map(colIdx => (
          <td key={colIdx} className="border border-[#D6CEBC] p-1.5 align-top">
            {disabled ? (
              <span className="text-xs font-serif">{row.values?.[`col${colIdx}`] || ''}</span>
            ) : (
              <input
                type="text"
                value={row.values?.[`col${colIdx}`] || ''}
                onChange={e => onMatrixCellChange(field.id, rowKey, colIdx, e.target.value)}
                className="w-full border-none bg-transparent text-xs font-serif outline-none p-0.5 placeholder:text-[#D6CEBC]"
                placeholder="—"
              />
            )}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="mb-4">
      {field.label && (
        <div className="text-sm text-[#1A1A1A] font-serif mb-2 font-semibold">{field.label}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs font-serif">
          <thead>
            <tr>
              <th className="border border-[#D6CEBC] p-1.5 text-left font-bold bg-[#1E4620] text-white w-[30%]">
                Case register
              </th>
              {columns.map((col, idx) => (
                <th key={idx} className="border border-[#D6CEBC] p-1.5 text-left font-bold bg-[#1E4620] text-white min-w-[200px]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(matrixData).map(([rowKey, row]) => renderRow(rowKey, row))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Field: two_col_table ─────────────────────────────────────────────────────
const TwoColTable: React.FC<{
  field: FormField;
  value: unknown;
  onChange: (id: string, v: unknown) => void;
  disabled: boolean;
}> = ({ field, value, onChange, disabled }) => {
  const rowCount = field.rowCount ?? 3;
  const headers  = field.tableColumns ?? ['Challenges', 'Recommendations'];
  const data = (value as { col1: string; col2: string }[]) ??
    Array.from({ length: rowCount }, () => ({ col1: '', col2: '' }));

  const handleCell = (idx: number, key: 'col1' | 'col2', val: string) =>
    onChange(field.id, data.map((r, i) => i === idx ? { ...r, [key]: val } : r));

  return (
    <div className="mb-4">
      {field.label && (
        <div className="text-sm text-[#1A1A1A] font-serif mb-2">{field.label}</div>
      )}
      <table className="w-full border-collapse text-sm font-serif">
        <thead>
          <tr>
            <th className="border border-[#D6CEBC] p-1.5 text-left font-bold bg-[#1E4620] text-white w-1/2">{headers[0]}</th>
            <th className="border border-[#D6CEBC] p-1.5 text-left font-bold bg-[#1E4620] text-white w-1/2">{headers[1]}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, i) => (
            <tr key={i}>
              {(['col1', 'col2'] as const).map(key => (
                <td key={key} className="border border-[#D6CEBC] p-1.5 align-top">
                  {disabled ? (
                    <span>{data[i]?.[key] ?? ''}</span>
                  ) : (
                    <textarea
                      value={data[i]?.[key] ?? ''}
                      onChange={e => handleCell(i, key, e.target.value)}
                      rows={2}
                      className="w-full border-none bg-transparent text-xs font-serif outline-none resize-vertical"
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Master Field Renderer ────────────────────────────────────────────────────
const FormFieldRenderer: React.FC<{
  field: FormField;
  value: unknown;
  answers: Record<string, unknown>;
  onChange: (id: string, v: unknown) => void;
  onMatrixCellChange: (fieldId: string, rowKey: string, colIndex: number, value: string) => void;
  errors: Record<string, string>;
  disabled: boolean;
}> = ({ field, value, answers, onChange, onMatrixCellChange, errors, disabled }) => {
  const isVisible = field.dependsOn ? answers[field.dependsOn.field] === field.dependsOn.value : true;
  if (!isVisible) return null;

  if (field.type === 'section')       return <SectionField field={field} />;
  if (field.type === 'yes_no')        return <YesNoField field={field} value={value} answers={answers} onChange={onChange} errors={errors} disabled={disabled} />;
  if (field.type === 'matrix')        return <MatrixField field={field} value={value as MatrixData | null | undefined} onChange={onChange} onMatrixCellChange={onMatrixCellChange} disabled={disabled} />;
  if (field.type === 'two_col_table') return <TwoColTable field={field} value={value} onChange={onChange} disabled={disabled} />;

  const label = (
    <label className="block text-sm text-[#1A1A1A] mb-1 font-serif leading-relaxed">
      {field.label}
      {field.required && <span className="text-[#B91C1C] ml-1">*</span>}
    </label>
  );
  const err = errors[field.id];
  const baseInputClass = `w-full p-2 text-sm font-serif bg-white text-[#1A1A1A] border rounded outline-none focus:ring-1 focus:ring-[#A37F2B] ${err ? 'border-[#B91C1C]' : 'border-[#D6CEBC]'}`;

  if (field.type === 'textarea') return (
    <div className="mb-4">
      {label}
      <textarea value={(value as string) || ''} onChange={e => onChange(field.id, e.target.value)} rows={3} placeholder={field.placeholder} disabled={disabled} className={`${baseInputClass} resize-vertical`} />
      {err && <p className="text-xs text-[#B91C1C] mt-1">{err}</p>}
    </div>
  );

  if (field.type === 'number') return (
    <div className="mb-4">
      {label}
      <input type="number" value={(value as number) ?? ''} disabled={disabled} onChange={e => onChange(field.id, e.target.value ? Number(e.target.value) : null)} className={`${baseInputClass} max-w-[200px]`} />
      {err && <p className="text-xs text-[#B91C1C] mt-1">{err}</p>}
    </div>
  );

  if (field.type === 'date') return (
    <div className="mb-4">
      {label}
      <input type="date" value={(value as string) || ''} disabled={disabled} onChange={e => onChange(field.id, e.target.value)} className={`${baseInputClass} max-w-[220px]`} />
      {err && <p className="text-xs text-[#B91C1C] mt-1">{err}</p>}
    </div>
  );

  return (
    <div className="mb-4">
      {label}
      <input type="text" value={(value as string) || ''} disabled={disabled} placeholder={field.placeholder} onChange={e => onChange(field.id, e.target.value)} className={baseInputClass} />
      {err && <p className="text-xs text-[#B91C1C] mt-1">{err}</p>}
    </div>
  );
};

// ─── Assignment Card ──────────────────────────────────────────────────────────
const AssignmentCard: React.FC<{ assignment: UserAssignment; onOpen: () => void }> = ({ assignment, onOpen }) => {
  const s = STATUS_CONFIG[assignment.status];
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`bg-[#FDFBF7] border border-[#D6CEBC] border-l-4 border-l-[#A37F2B] rounded p-3.5 cursor-pointer transition-shadow ${hovered ? 'shadow-md' : 'shadow-none'}`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="font-serif font-bold text-sm text-[#1E4620]">{assignment.component_name}</div>
          <div className="text-xs text-[#6B6253] mt-0.5">{assignment.component_section}</div>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full ${s.bg} ${s.color} text-xs font-semibold whitespace-nowrap`}>
          {s.icon} {s.label}
        </div>
      </div>
      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-[#D6CEBC]">
        <span className="text-xs text-[#6B6253]">
          Assigned by {assignment.assigned_by_name} · {new Date(assignment.assigned_at).toLocaleDateString()}
        </span>
        <ChevronRight size={14} className="text-[#6B6253]" />
      </div>
    </div>
  );
};

// ─── Summary Cards ────────────────────────────────────────────────────────────
const SummaryCards: React.FC<{
  summary: { total: string; pending: string; in_progress: string; submitted: string } | null;
}> = ({ summary }) => {
  if (!summary) return null;
  const cards = [
    { label: 'Total',       value: summary.total,       accent: '#1E4620', icon: <FileText size={18} />    },
    { label: 'Pending',     value: summary.pending,     accent: '#92400E', icon: <Clock size={18} />        },
    { label: 'In Progress', value: summary.in_progress, accent: '#1E40AF', icon: <Save size={18} />         },
    { label: 'Completed',   value: summary.submitted,   accent: '#065F46', icon: <CheckCircle size={18} /> },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map(c => (
        <div key={c.label} className="bg-[#FDFBF7] border border-[#D6CEBC] border-t-3 rounded p-3" style={{ borderTopColor: c.accent }}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[0.65rem] uppercase tracking-wide text-[#6B6253] font-serif">{c.label}</div>
              <div className="text-2xl font-bold font-serif mt-0.5" style={{ color: c.accent }}>{c.value}</div>
            </div>
            <div className="opacity-50" style={{ color: c.accent }}>{c.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Form Header ──────────────────────────────────────────────────────────────
const FormHeader: React.FC<{ assignment: UserAssignmentDetail }> = ({ assignment }) => {
  const s = STATUS_CONFIG[assignment.status];
  return (
    <div className="bg-[#1E4620] rounded-t relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#A37F2B]" />
      <div className="p-5">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <div className="text-[0.65rem] tracking-wider uppercase text-[#C9A84C] font-serif mb-1">
              Office of the Registrar · High Court of Kenya
            </div>
            <h1 className="font-serif text-base font-bold text-white m-0 leading-tight">{assignment.component_name}</h1>
            <div className="text-sm text-white/70 mt-0.5">{assignment.component_section}</div>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${s.bg} ${s.color} text-xs font-bold whitespace-nowrap flex-shrink-0`}>
            {s.icon} {s.label}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-white/15 flex gap-6 flex-wrap">
          <div className="text-xs text-white/60">
            <span className="text-[#C9A84C]">Assigned by</span> {assignment.assigned_by_name}
          </div>
          <div className="text-xs text-white/60">
            <span className="text-[#C9A84C]">Date</span>{' '}
            {new Date(assignment.assigned_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────
const FormProgress: React.FC<{ total: number; completed: number }> = ({ total, completed }) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="p-2.5 bg-[#F5F0E8] border-b border-[#D6CEBC]">
      <div className="flex justify-between text-xs text-[#6B6253] mb-1 font-serif">
        <span>Form Completion</span>
        <span className="font-bold text-[#1E4620]">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[#D6CEBC] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: pct === 100 ? '#065F46' : '#A37F2B' }} />
      </div>
      <div className="text-[0.68rem] text-[#6B6253] mt-0.5">{completed} of {total} fields completed</div>
    </div>
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#A37F2B' }) => (
  <Loader2 size={size} style={{ ...spinning, color }} />
);

// ─── Station Banner ───────────────────────────────────────────────────────────
const StationBanner: React.FC<{ name: string; compact?: boolean }> = ({ name, compact = false }) => (
  <div className={`flex items-center justify-between bg-[#F5F0E8] border border-[#D6CEBC] rounded ${compact ? 'p-2.5 mb-4' : 'p-3 mb-5'}`}>
    <div className="flex items-center gap-2">
      <div className={`rounded-full bg-[#A37F2B] ${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
      <span className={`font-serif text-[#6B6253] uppercase tracking-wide ${compact ? 'text-[0.6rem]' : 'text-xs'}`}>
        {compact ? 'Station' : 'Assigned Station'}
      </span>
    </div>
    <span className={`font-serif font-bold text-[#1E4620] ${compact ? 'text-xs' : 'text-sm'}`}>{name}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const UserAssignments: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const {
    assignments, activeAssignment, summary,
    isLoading, isSaving, isSubmitting, error, actionSuccess,
  } = useSelector((state: RootState) => state.userAssignment);

  // myStation comes from stationSlice — populated by fetchMyStation (GET /user/station)
  const { myStation } = useSelector((state: RootState) => state.userAssignment);

  const [view, setView]                         = useState<'list' | 'form'>('list');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [lastSaved, setLastSaved]               = useState<Date | null>(null);
  const [filterStatus, setFilterStatus]         = useState<'pending' | 'in_progress' | 'submitted' | undefined>(undefined);

  const autoSaveTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAssignmentRef = useRef(activeAssignment);
  useEffect(() => { activeAssignmentRef.current = activeAssignment; }, [activeAssignment]);

  // ── On mount: fetch station (user-scoped), assignments, summary ────────────
  useEffect(() => {
    dispatch(fetchMyStation());        // GET /user/station — no 403
    dispatch(fetchMyAssignments({}));
    dispatch(getAssignmentSummary());
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      dispatch(clearActiveAssignment());
      dispatch(clearUserAssignmentError());
    };
  }, [dispatch]);

  // ── Clear success flag after 3 s ───────────────────────────────────────────
  useEffect(() => {
    if (!actionSuccess) return;
    const t = setTimeout(() => dispatch(resetUserAssignmentSuccess()), 3000);
    return () => clearTimeout(t);
  }, [actionSuccess, dispatch]);

  // ── Auto-save every 30 s while form is open ───────────────────────────────
  useEffect(() => {
    const id     = activeAssignment?.id;
    const status = activeAssignment?.status;
    if (!id || status === 'submitted' || view !== 'form') return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      const cur = activeAssignmentRef.current;
      const ans = cur?.answers;
      if (ans && Object.keys(ans).length > 0 && !isSubmitting) {
        dispatch(saveAssignmentDraft({ id: cur!.id, answers: ans }))
          .then(() => setLastSaved(new Date()));
      }
    }, 30000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [activeAssignment?.id, activeAssignment?.status, view, dispatch, isSubmitting]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleOpenAssignment = useCallback(async (id: number) => {
    const r = await dispatch(fetchMyAssignmentById(id));
    if (fetchMyAssignmentById.fulfilled.match(r)) {
      setView('form');
      setValidationErrors({});
      setLastSaved(null);
      r.payload.form_json?.fields?.forEach((field: FormField) => {
        if (field.type === 'matrix' && !r.payload.answers?.[field.id]) {
          dispatch(initializeMatrixField({ fieldId: field.id, field }));
        }
      });
    }
  }, [dispatch]);

  const handleBackToList = useCallback(() => {
    setView('list');
    dispatch(clearActiveAssignment());
    setValidationErrors({});
    setLastSaved(null);
    dispatch(fetchMyAssignments({}));
    dispatch(getAssignmentSummary());
  }, [dispatch]);

  const handleFieldChange = useCallback((fieldId: string, value: unknown) => {
    dispatch(updateLocalAnswers({ fieldId, value }));
    setValidationErrors(prev => {
      if (!prev[fieldId]) return prev;
      const n = { ...prev }; delete n[fieldId]; return n;
    });
  }, [dispatch]);

  const handleMatrixCellChange = useCallback(
    (fieldId: string, rowKey: string, colIndex: number, value: string) => {
      dispatch(updateMatrixCell({ fieldId, rowKey, colIndex, value }));
      setValidationErrors(prev => {
        if (!prev[fieldId]) return prev;
        const n = { ...prev }; delete n[fieldId]; return n;
      });
    },
    [dispatch],
  );

  const validateForm = useCallback((assignment: UserAssignmentDetail): boolean => {
    const fields  = assignment.form_json?.fields ?? [];
    const answers = assignment.answers ?? {};
    const errs: Record<string, string> = {};
    fields.forEach(f => {
      if (!f.required || f.type === 'section') return;
      const v = answers[f.id];
      if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
        errs[f.id] = `${f.label} is required`;
      }
    });
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!activeAssignment || activeAssignment.status === 'submitted') return;
    const answers = activeAssignment.answers;
    if (!answers || Object.keys(answers).length === 0) return;
    const r = await dispatch(saveAssignmentDraft({ id: activeAssignment.id, answers }));
    if (saveAssignmentDraft.fulfilled.match(r)) {
      setLastSaved(new Date());
      dispatch(getAssignmentSummary());
    }
  }, [dispatch, activeAssignment]);

  const handleSubmit = useCallback(async () => {
    if (!activeAssignment || activeAssignment.status === 'submitted') return;
    if (!validateForm(activeAssignment)) return;
    if (window.confirm('Are you sure you want to submit this assignment? You cannot edit it after submission.')) {
      const r = await dispatch(
        submitAssignment({ id: activeAssignment.id, answers: activeAssignment.answers ?? {} }),
      );
      if (submitAssignment.fulfilled.match(r)) {
        setView('list');
        dispatch(clearActiveAssignment());
        dispatch(fetchMyAssignments({}));
        dispatch(getAssignmentSummary());
      }
    }
  }, [dispatch, activeAssignment, validateForm]);

  const handleFilterChange = useCallback(
    (status?: 'pending' | 'in_progress' | 'submitted') => {
      setFilterStatus(status);
      dispatch(fetchMyAssignments(status ? { status } : {}));
    },
    [dispatch],
  );

  const completedFieldsCount = (() => {
    if (!activeAssignment) return 0;
    const fields  = activeAssignment.form_json?.fields ?? [];
    const answers = activeAssignment.answers ?? {};
    return fields.filter(f => {
      if (f.type === 'section') return false;
      const v = answers[f.id];
      return v !== undefined && v !== null && v !== '' && (typeof v !== 'string' || v.trim() !== '');
    }).length;
  })();

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  if (view === 'list') {
    const pending    = assignments.filter(a => a.status === 'pending');
    const inProgress = assignments.filter(a => a.status === 'in_progress');
    const submitted  = assignments.filter(a => a.status === 'submitted');

    if (isLoading && assignments.length === 0) return (
      <div className="flex items-center justify-center min-h-[300px] gap-2.5">
        <Spinner /><span className="font-serif text-sm text-[#6B6253]">Loading assignments…</span>
      </div>
    );

    return (
      <div className="p-6 max-w-[860px] mx-auto">

        {myStation && <StationBanner name={myStation.name} />}

        <div className="mb-5 border-b-3 border-[#1E4620] pb-3">
          <div className="text-[0.65rem] tracking-wider uppercase text-[#A37F2B] font-serif mb-0.5">
            Office of the Registrar · High Court of Kenya
          </div>
          <h1 className="font-serif text-xl font-bold text-[#1E4620] m-0">My Assignments</h1>
          <p className="text-sm text-[#6B6253] mt-0.5 font-serif">Complete your assigned inspection forms</p>
        </div>

        <SummaryCards summary={summary} />

        <div className="flex gap-5 border-b border-[#D6CEBC] mb-5">
          {[
            { label: 'All',         count: assignments.length, active: !filterStatus,                  onClick: () => handleFilterChange(undefined)     },
            { label: 'Pending',     count: pending.length,     active: filterStatus === 'pending',     onClick: () => handleFilterChange('pending')     },
            { label: 'In Progress', count: inProgress.length,  active: filterStatus === 'in_progress', onClick: () => handleFilterChange('in_progress') },
            { label: 'Completed',   count: submitted.length,   active: filterStatus === 'submitted',   onClick: () => handleFilterChange('submitted')   },
          ].map(tab => (
            <button
              key={tab.label}
              onClick={tab.onClick}
              className={`pb-2 px-1 text-sm font-serif transition-colors ${tab.active ? 'font-bold text-[#1E4620] border-b-2 border-[#A37F2B]' : 'text-[#6B6253] border-b-2 border-transparent'}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {error && (
          <div className="flex justify-between items-center p-2.5 bg-red-50 border border-red-200 rounded mb-3.5">
            <span className="text-sm text-[#B91C1C] font-serif">{error}</span>
            <button onClick={() => dispatch(clearUserAssignmentError())} className="bg-none border-none cursor-pointer p-0">
              <AlertCircle size={14} color="#B91C1C" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded mb-3.5">
            <span className="text-sm text-emerald-800 font-serif">✓ Assignment submitted successfully.</span>
          </div>
        )}

        {[
          { list: pending,    label: 'To Do',      show: !filterStatus || filterStatus === 'pending'     },
          { list: inProgress, label: 'In Progress', show: !filterStatus || filterStatus === 'in_progress' },
          { list: submitted,  label: 'Completed',   show: !filterStatus || filterStatus === 'submitted'   },
        ].map(({ list, label, show }) =>
          show && list.length > 0 ? (
            <div key={label} className="mb-6">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="font-serif font-bold text-sm text-[#1E4620]">{label} ({list.length})</span>
              </div>
              <div className="flex flex-col gap-2">
                {list.map(a => <AssignmentCard key={a.id} assignment={a} onOpen={() => handleOpenAssignment(a.id)} />)}
              </div>
            </div>
          ) : null
        )}

        {assignments.length === 0 && !isLoading && (
          <div className="text-center p-12 bg-[#FDFBF7] border border-[#D6CEBC] rounded">
            <CheckCircle size={40} className="text-[#D6CEBC] mx-auto mb-2.5" />
            <p className="font-serif text-[#6B6253] text-sm mb-1">No assignments yet</p>
            <p className="font-serif text-xs text-[#D6CEBC] m-0">When you're assigned an inspection form, it will appear here.</p>
          </div>
        )}
      </div>
    );
  }

  // ── FORM VIEW ──────────────────────────────────────────────────────────────
  if (view === 'form') {
    if (isLoading || !activeAssignment) return (
      <div className="flex items-center justify-center min-h-[300px] gap-2.5">
        <Spinner /><span className="font-serif text-sm text-[#6B6253]">Loading form…</span>
      </div>
    );

    const fields      = activeAssignment.form_json?.fields ?? [];
    const answers     = activeAssignment.answers ?? {};
    const isSubmitted = activeAssignment.status === 'submitted';
    const totalFields = fields.filter(f => f.type !== 'section').length;

    return (
      <div className="max-w-[860px] mx-auto p-6">
        <button
          onClick={handleBackToList}
          className="inline-flex items-center gap-1 bg-none border-none cursor-pointer text-[#6B6253] text-sm font-serif mb-4 p-0 hover:text-[#1E4620] transition-colors"
        >
          <ArrowLeft size={14} /> Back to Assignments
        </button>

        {myStation && <StationBanner name={myStation.name} compact />}

        <div className="border border-[#D6CEBC] rounded overflow-hidden shadow-sm">
          <FormHeader assignment={activeAssignment} />

          {!isSubmitted && <FormProgress total={totalFields} completed={completedFieldsCount} />}

          {lastSaved && !isSubmitted && (
            <div className="px-6 py-1 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800 font-serif text-right">
              ✓ Draft saved at {lastSaved.toLocaleTimeString()}
            </div>
          )}

          {error && (
            <div className="px-6 py-2.5 bg-red-50 border-b border-red-200">
              <span className="text-sm text-[#B91C1C] font-serif">{error}</span>
            </div>
          )}

          <div className="p-7 bg-white">
            {fields.length === 0 ? (
              <p className="text-center text-[#6B6253] font-serif text-sm">No fields in this form.</p>
            ) : (
              fields.map(field => (
                <div key={field.id} id={`field-${field.id}`}>
                  <FormFieldRenderer
                    field={field}
                    value={answers[field.id]}
                    answers={answers}
                    onChange={handleFieldChange}
                    onMatrixCellChange={handleMatrixCellChange}
                    errors={validationErrors}
                    disabled={isSubmitted}
                  />
                </div>
              ))
            )}
          </div>

          {isSubmitted && (
            <div className="p-5 bg-emerald-50 border-t border-emerald-200 text-center">
              <CheckCircle size={28} className="text-emerald-800 mx-auto mb-2" />
              <div className="font-serif font-bold text-emerald-800 text-sm">Assignment Submitted</div>
              {activeAssignment.submitted_at && (
                <div className="text-xs text-emerald-700 mt-0.5 font-serif">
                  Submitted on {new Date(activeAssignment.submitted_at).toLocaleString('en-KE', { dateStyle: 'long', timeStyle: 'short' })}
                </div>
              )}
            </div>
          )}

          {!isSubmitted && (
            <div className="p-3.5 border-t border-[#D6CEBC] bg-[#F5F0E8] flex gap-2.5 justify-end">
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#D6CEBC] rounded bg-white text-[#1E4620] text-sm font-serif font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                {isSaving ? <Spinner size={13} /> : <Save size={13} />}
                {isSaving ? 'Saving…' : 'Save Draft'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 border-none rounded bg-[#1E4620] text-white text-sm font-serif font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#153315] transition-colors"
              >
                {isSubmitting ? <Spinner size={13} color="#fff" /> : <CheckCircle size={13} />}
                {isSubmitting ? 'Submitting…' : 'Submit Assignment'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default UserAssignments;