// src/pages/user/UserDashboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchMyAssignments,
  fetchMyAssignmentById,
  saveAssignmentDraft,
  submitAssignment,
  getAssignmentSummary,
  clearActiveAssignment,
  resetUserAssignmentSuccess,
  updateLocalAnswers,
  type FormField,
} from '../../store/slices/userAssignmentSlice';
import type { AppDispatch, RootState } from '../../store/store';
import { Loader2, Save, Send, ChevronLeft, CheckCircle, Clock, AlertCircle } from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'submitted';

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  in_progress: { label: 'In Progress', icon: Save, color: 'text-blue-600', bg: 'bg-blue-50' },
  submitted: { label: 'Submitted', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
};

const UserDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { assignments, activeAssignment, summary, isLoading, isSaving, isSubmitting, error, actionSuccess } =
    useSelector((state: RootState) => state.userAssignment);

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef<Record<string, unknown> | null>(null);

  // Load summary and assignments on mount
  useEffect(() => {
    dispatch(getAssignmentSummary());
    dispatch(fetchMyAssignments({}));
  }, [dispatch]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => dispatch(resetUserAssignmentSuccess()), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess, dispatch]);

  // Keep answers ref updated without triggering timer reset
useEffect(() => {
  if (activeAssignment) {
    answersRef.current = activeAssignment.answers || {};
  }
}, [activeAssignment?.answers]);

// Auto-save draft every 30 seconds (timer resets only on assignment change)
useEffect(() => {
  if (activeAssignment && activeAssignment.status !== 'submitted') {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      if (answersRef.current && Object.keys(answersRef.current).length > 0) {
        dispatch(saveAssignmentDraft({ id: activeAssignment.id, answers: answersRef.current }));
      }
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }
}, [activeAssignment?.id, activeAssignment?.status, dispatch]);

  const handleSelectAssignment = (id: number) => {
    setSelectedId(id);
    dispatch(fetchMyAssignmentById(id));
  };

  const handleBackToList = () => {
    setSelectedId(null);
    dispatch(clearActiveAssignment());
  };

  const handleFieldChange = (fieldId: string, value: unknown) => {
    dispatch(updateLocalAnswers({ fieldId, value }));
  };

  const handleSaveDraft = () => {
    if (activeAssignment && activeAssignment.answers) {
      dispatch(saveAssignmentDraft({ id: activeAssignment.id, answers: activeAssignment.answers }));
    }
  };

  const handleSubmit = async () => {
    if (activeAssignment && activeAssignment.answers) {
      await dispatch(submitAssignment({ id: activeAssignment.id, answers: activeAssignment.answers }));
      handleBackToList();
      dispatch(fetchMyAssignments({}));
      dispatch(getAssignmentSummary());
    }
  };

  const filteredAssignments = assignments.filter((a) => filter === 'all' || a.status === filter);

  const renderField = (field: FormField, value: unknown, onChange: (val: unknown) => void) => {
    const commonInputClass = "w-full px-3 py-2 rounded-lg border border-[#d6c9a8] focus:outline-none focus:ring-2 focus:ring-[#c9a84c] bg-white";

    switch (field.type) {
      case 'yes_no':
        return (
          <div className="flex gap-4">
            {['Yes', 'No'].map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.id}
                  value={opt.toLowerCase()}
                  checked={value === opt.toLowerCase()}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-4 h-4 accent-[#1a3d1c]"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'textarea':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`${commonInputClass} min-h-[100px]`}
            placeholder={field.placeholder}
          />
        );
      case 'text':
      case 'number':
      case 'date':
        return (
          <input
            type={field.type}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={commonInputClass}
            placeholder={field.placeholder}
          />
        );
      default:
        return <p className="text-sm text-gray-500">Unsupported field type: {field.type}</p>;
    }
  };

  if (isLoading && assignments.length === 0 && !activeAssignment) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin" size={32} style={{ color: '#c9a84c' }} />
      </div>
    );
  }

  if (selectedId && activeAssignment) {
    const isSubmitted = activeAssignment.status === 'submitted';
    return (
      <div className="max-w-4xl mx-auto p-6 bg-[#fdf8f0] min-h-screen">
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-sm font-medium mb-6 transition-colors hover:text-[#c9a84c]"
          style={{ color: '#1a3d1c' }}
        >
          <ChevronLeft size={18} /> Back to assignments
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-[#d6c9a8] p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold font-serif" style={{ color: '#1a3d1c' }}>
                {activeAssignment.component_name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{activeAssignment.component_section}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[activeAssignment.status].bg} ${STATUS_CONFIG[activeAssignment.status].color}`}>
              {STATUS_CONFIG[activeAssignment.status].label}
            </div>
          </div>

          {activeAssignment.form_json?.fields.map((field) => (
            <div key={field.id} className="mb-6">
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1a3d1c' }}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field, activeAssignment.answers?.[field.id], (val) => handleFieldChange(field.id, val))}
            </div>
          ))}

          {!isSubmitted && (
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[#f0e8d6]">
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: '#f0e8d6', color: '#1a3d1c' }}
                onMouseEnter={(e) => { if (!isSaving) e.currentTarget.style.background = '#e6ddc8'; }}
                onMouseLeave={(e) => { if (!isSaving) e.currentTarget.style.background = '#f0e8d6'; }}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin inline mr-1" /> : <Save size={16} className="inline mr-1" />}
                Save Draft
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: '#1a3d1c', color: '#fdf8f0' }}
                onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#2d6a4f'; }}
                onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#1a3d1c'; }}
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin inline mr-1" /> : <Send size={16} className="inline mr-1" />}
                Submit
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-[#fdf8f0] min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif" style={{ color: '#1a3d1c' }}>
          My Assignments
        </h1>
        <p className="text-sm text-gray-500 mt-1">Complete your inspection forms</p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-[#d6c9a8] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Pending</span>
              <AlertCircle size={18} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold mt-2" style={{ color: '#1a3d1c' }}>{summary.pending}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#d6c9a8] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">In Progress</span>
              <Save size={18} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold mt-2" style={{ color: '#1a3d1c' }}>{summary.in_progress}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#d6c9a8] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Submitted</span>
              <CheckCircle size={18} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-2" style={{ color: '#1a3d1c' }}>{summary.submitted}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b border-[#d6c9a8]">
        {(['all', 'pending', 'in_progress', 'submitted'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-sm font-medium transition-all ${
              filter === tab
                ? 'border-b-2 border-[#c9a84c] text-[#1a3d1c]'
                : 'text-gray-500 hover:text-[#1a3d1c]'
            }`}
          >
            {tab === 'all' ? 'All' : STATUS_CONFIG[tab].label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {actionSuccess && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          ✓ Action completed successfully.
        </div>
      )}

      {filteredAssignments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-[#d6c9a8]">
          <p className="text-gray-500">No assignments found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((assignment) => {
            const StatusIcon = STATUS_CONFIG[assignment.status].icon;
            return (
              <button
                key={assignment.id}
                onClick={() => handleSelectAssignment(assignment.id)}
                className="w-full text-left bg-white rounded-xl border border-[#d6c9a8] p-5 shadow-sm transition-all hover:shadow-md hover:border-[#c9a84c]"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: '#1a3d1c' }}>
                      {assignment.component_name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{assignment.component_section}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Assigned by {assignment.assigned_by_name} · {new Date(assignment.assigned_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[assignment.status].bg} ${STATUS_CONFIG[assignment.status].color}`}>
                    <StatusIcon size={12} />
                    {STATUS_CONFIG[assignment.status].label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;