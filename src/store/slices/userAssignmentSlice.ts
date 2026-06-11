// src/store/slices/userAssignmentSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { Station } from './stationSlice';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface MatrixRowValue {
  col0?: string;
  col1?: string;
  col2?: string;
  [key: string]: string | undefined;
}

export interface MatrixRow {
  type: 'section' | 'row';
  label: string;
  isSectionHeader?: boolean;
  indent?: number;
  parentSection?: string | null;
  values?: MatrixRowValue;
  colspan?: number;
}

export interface MatrixData {
  [rowKey: string]: MatrixRow;
}

export interface MatrixRowDefinition {
  name: string;
  isSectionHeader?: boolean;
  indent?: number;
  parentSection?: string;
  colspan?: number;
}

export interface FormField {
  id: string;
  label: string;
  type: 'yes_no' | 'text' | 'number' | 'date' | 'textarea'
        | 'table' | 'matrix' | 'challenge_table'
        | 'section'
        | 'two_col_table';
  required?: boolean;
  dependsOn?: { field: string; value: unknown };
  subFields?: FormField[];
  columns?: string[];
  rows?: MatrixRowDefinition[];
  placeholder?: string;
  followUpLabel?: string;
  tableRows?: string[];
  tableColumns?: string[];
  rowCount?: number;
  sectionStyle?: 'band' | 'sub';
  sectionNumber?: string;
}

export interface UserAssignment {
  id: number;
  component_id: number;
  component_name: string;
  component_section: string;
  status: 'pending' | 'in_progress' | 'submitted';
  assigned_at: string;
  submitted_at?: string | null;
  assigned_by_name: string;
  assigned_by_email: string;
}

export interface UserAssignmentDetail extends UserAssignment {
  answers: Record<string, unknown> | null;
  form_json: { fields: FormField[] };
  assigned_by: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface AssignmentSummary {
  total: string;
  pending: string;
  in_progress: string;
  submitted: string;
}

export interface AssignmentStatus {
  id: number;
  status: 'pending' | 'in_progress' | 'submitted';
  assigned_at: string;
  submitted_at?: string | null;
}

interface SaveDraftResponse {
  id: number;
  status: 'pending' | 'in_progress' | 'submitted';
  answers: Record<string, unknown>;
  updated_at: string;
}

interface UpdateMatrixCellPayload {
  fieldId: string;
  rowKey: string;
  colIndex: number;
  value: string;
}

interface InitializeMatrixFieldPayload {
  fieldId: string;
  field: FormField;
}

interface UpdateLocalAnswersPayload {
  fieldId: string;
  value: unknown;
}

interface UserAssignmentState {
  assignments: UserAssignment[];
  activeAssignment: UserAssignmentDetail | null;
  summary: AssignmentSummary | null;
  myStation: Station | null;          // ← station for the logged-in user
  isLoading: boolean;
  isLoadingMyStation: boolean;        // ← separate flag so it doesn't block the list
  isSaving: boolean;
  isSubmitting: boolean;
  error: string | null;
  actionSuccess: boolean;
}

const initialState: UserAssignmentState = {
  assignments: [],
  activeAssignment: null,
  summary: null,
  myStation: null,
  isLoading: false,
  isLoadingMyStation: false,
  isSaving: false,
  isSubmitting: false,
  error: null,
  actionSuccess: false,
};

const USER_BASE = '/user';

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const { response } = error as { response?: { data?: { message?: string } } };
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
};

// ─── MATRIX HELPERS ───────────────────────────────────────────────────────────

export const initializeMatrixData = (field: FormField): MatrixData | null => {
  if (field.type !== 'matrix' || !field.rows) return null;
  const matrixData: MatrixData = {};
  field.rows.forEach((row: MatrixRowDefinition, idx: number) => {
    const rowKey = row.isSectionHeader
      ? `section_${row.name.replace(/\s+/g, '_')}`
      : `row_${idx}`;
    matrixData[rowKey] = {
      type: row.isSectionHeader ? 'section' : 'row',
      label: row.name,
      isSectionHeader: row.isSectionHeader || false,
      indent: row.indent || 0,
      parentSection: row.parentSection || null,
      values: row.isSectionHeader ? {} : { col0: '', col1: '', col2: '' },
      colspan: row.colspan,
    };
  });
  return matrixData;
};

export const updateMatrixCellValue = (
  matrixData: MatrixData,
  rowKey: string,
  colIndex: number,
  value: string,
): MatrixData => {
  if (!matrixData[rowKey]) return matrixData;
  return {
    ...matrixData,
    [rowKey]: {
      ...matrixData[rowKey],
      values: { ...matrixData[rowKey].values, [`col${colIndex}`]: value },
    },
  };
};

export const getRowsBySection = (matrixData: MatrixData, sectionName: string): string[] => {
  const sectionKey = `section_${sectionName.replace(/\s+/g, '_')}`;
  if (!matrixData[sectionKey]) return [];
  const rows: string[] = [];
  let foundSection = false;
  for (const [rowKey, row] of Object.entries(matrixData)) {
    if (rowKey === sectionKey) { foundSection = true; }
    else if (foundSection && row.parentSection === sectionName) { rows.push(rowKey); }
    else if (foundSection && row.type === 'section') { foundSection = false; }
  }
  return rows;
};

export const hasMatrixAnswers = (matrixData: MatrixData | null | undefined): boolean => {
  if (!matrixData) return false;
  return Object.values(matrixData).some((row: MatrixRow) => {
    if (row.type === 'section') return false;
    const v = row.values;
    return !!(v && (v.col0 || v.col1 || v.col2));
  });
};

export const validateMatrixField = (
  matrixData: MatrixData | null | undefined,
  requiredColumns?: number[],
): { isValid: boolean; missingFields: string[] } => {
  if (!matrixData) return { isValid: true, missingFields: [] };
  const missingFields: string[] = [];
  const colsToCheck = requiredColumns || [0, 1, 2];
  Object.values(matrixData).forEach((row: MatrixRow) => {
    if (row.type === 'section') return;
    colsToCheck.forEach((colIdx: number) => {
      const value = row.values?.[`col${colIdx}`];
      if (!value || value.trim() === '') {
        missingFields.push(`${row.label} - Column ${colIdx + 1}`);
      }
    });
  });
  return { isValid: missingFields.length === 0, missingFields };
};

// ─── THUNKS ───────────────────────────────────────────────────────────────────

export const fetchMyStation = createAsyncThunk<Station | null, void>(
  'userAssignment/fetchMyStation',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${USER_BASE}/station`);
      return (data.station as Station) ?? null;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchMyAssignments = createAsyncThunk<
  UserAssignment[],
  { status?: 'pending' | 'in_progress' | 'submitted' } | void
>('userAssignment/fetchMyAssignments', async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    const url = query.toString()
      ? `${USER_BASE}/assignments?${query}`
      : `${USER_BASE}/assignments`;
    console.log('🔍 Fetching user assignments from:', url);
    const { data } = await axiosClient.get(url);
    console.log(`📦 Received ${data.assignments?.length || 0} assignments`);
    return data.assignments as UserAssignment[];
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchMyAssignmentById = createAsyncThunk<UserAssignmentDetail, number>(
  'userAssignment/fetchMyAssignmentById',
  async (id, { rejectWithValue }) => {
    try {
      console.log(`🔍 Fetching assignment ${id} details`);
      const { data } = await axiosClient.get(`${USER_BASE}/assignments/${id}`);
      console.log(`✅ Assignment ${id} loaded:`, data.assignment.component_name);
      const assignment = data.assignment as UserAssignmentDetail;
      if (assignment.form_json?.fields) {
        assignment.form_json.fields.forEach((field: FormField) => {
          if (field.type === 'matrix' && !assignment.answers?.[field.id]) {
            if (!assignment.answers) assignment.answers = {};
            assignment.answers[field.id] = initializeMatrixData(field);
          }
        });
      }
      return assignment;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const saveAssignmentDraft = createAsyncThunk<
  SaveDraftResponse,
  { id: number; answers: Record<string, unknown> }
>('userAssignment/saveAssignmentDraft', async ({ id, answers }, { rejectWithValue }) => {
  try {
    console.log(`💾 Saving draft for assignment ${id}`);
    const { data } = await axiosClient.patch(`${USER_BASE}/assignments/${id}/save`, { answers });
    console.log(`✅ Draft saved for assignment ${id}`);
    return data.assignment as SaveDraftResponse;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const submitAssignment = createAsyncThunk<
  UserAssignmentDetail,
  { id: number; answers: Record<string, unknown>; validateMatrix?: boolean }
>('userAssignment/submitAssignment', async ({ id, answers }, { rejectWithValue }) => {
  try {
    console.log(`📤 Submitting assignment ${id}`);
    const { data } = await axiosClient.post(`${USER_BASE}/assignments/${id}/submit`, { answers });
    console.log(`✅ Assignment ${id} submitted successfully`);
    return data.assignment as UserAssignmentDetail;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const getAssignmentStatus = createAsyncThunk<AssignmentStatus, number>(
  'userAssignment/getAssignmentStatus',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${USER_BASE}/assignments/${id}/status`);
      return data.status as AssignmentStatus;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const getAssignmentSummary = createAsyncThunk<AssignmentSummary, void>(
  'userAssignment/getAssignmentSummary',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${USER_BASE}/assignments/summary`);
      console.log('📊 Assignment summary:', data.summary);
      return data.summary as AssignmentSummary;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ─── SLICE ────────────────────────────────────────────────────────────────────

const userAssignmentSlice = createSlice({
  name: 'userAssignment',
  initialState,
  reducers: {
    clearUserAssignmentError: (state) => { state.error = null; },
    resetUserAssignmentSuccess: (state) => { state.actionSuccess = false; },
    clearActiveAssignment: (state) => { state.activeAssignment = null; },
    updateLocalAnswers: (state, action: PayloadAction<UpdateLocalAnswersPayload>) => {
      const { fieldId, value } = action.payload;
      if (state.activeAssignment) {
        if (!state.activeAssignment.answers) state.activeAssignment.answers = {};
        state.activeAssignment.answers[fieldId] = value;
      }
    },
    updateMatrixCell: (state, action: PayloadAction<UpdateMatrixCellPayload>) => {
      const { fieldId, rowKey, colIndex, value } = action.payload;
      if (state.activeAssignment?.answers) {
        const matrixData = state.activeAssignment.answers[fieldId] as MatrixData;
        if (matrixData) {
          state.activeAssignment.answers[fieldId] = updateMatrixCellValue(matrixData, rowKey, colIndex, value);
        }
      }
    },
    initializeMatrixField: (state, action: PayloadAction<InitializeMatrixFieldPayload>) => {
      const { fieldId, field } = action.payload;
      if (state.activeAssignment?.answers && !state.activeAssignment.answers[fieldId]) {
        state.activeAssignment.answers[fieldId] = initializeMatrixData(field);
      }
    },
  },
  extraReducers: (builder) => {
    builder

      // ── fetchMyStation ────────────────────────────────────────────────────
      .addCase(fetchMyStation.pending, (state) => {
        state.isLoadingMyStation = true;
        state.error = null;
      })
      .addCase(fetchMyStation.fulfilled, (state, action: PayloadAction<Station | null>) => {
        state.isLoadingMyStation = false;
        state.myStation = action.payload;
      })
      .addCase(fetchMyStation.rejected, (state) => {
        // Non-fatal — banner simply won't show
        state.isLoadingMyStation = false;
        state.myStation = null;
      })

      // ── fetchMyAssignments ────────────────────────────────────────────────
      .addCase(fetchMyAssignments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyAssignments.fulfilled, (state, action: PayloadAction<UserAssignment[]>) => {
        state.isLoading = false;
        state.assignments = action.payload;
      })
      .addCase(fetchMyAssignments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ── fetchMyAssignmentById ─────────────────────────────────────────────
      .addCase(fetchMyAssignmentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyAssignmentById.fulfilled, (state, action: PayloadAction<UserAssignmentDetail>) => {
        state.isLoading = false;
        state.activeAssignment = action.payload;
        const index = state.assignments.findIndex(a => a.id === action.payload.id);
        if (index !== -1 && state.assignments[index].status !== action.payload.status) {
          state.assignments[index].status = action.payload.status;
        }
      })
      .addCase(fetchMyAssignmentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ── saveAssignmentDraft ───────────────────────────────────────────────
      .addCase(saveAssignmentDraft.pending, (state) => {
        state.isSaving = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(saveAssignmentDraft.fulfilled, (state, action: PayloadAction<SaveDraftResponse>) => {
        state.isSaving = false;
        state.actionSuccess = true;
        if (state.activeAssignment?.id === action.payload.id) {
          state.activeAssignment.answers = action.payload.answers;
          state.activeAssignment.status = action.payload.status;
        }
        const index = state.assignments.findIndex(a => a.id === action.payload.id);
        if (index !== -1 && state.assignments[index].status !== action.payload.status) {
          state.assignments[index].status = action.payload.status;
        }
      })
      .addCase(saveAssignmentDraft.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
        state.actionSuccess = false;
      })

      // ── submitAssignment ──────────────────────────────────────────────────
      .addCase(submitAssignment.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(submitAssignment.fulfilled, (state, action: PayloadAction<UserAssignmentDetail>) => {
        state.isSubmitting = false;
        state.actionSuccess = true;
        state.activeAssignment = action.payload;
        const index = state.assignments.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.assignments[index].status = 'submitted';
          state.assignments[index].submitted_at = action.payload.submitted_at;
        }
      })
      .addCase(submitAssignment.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
        state.actionSuccess = false;
      })

      // ── getAssignmentStatus ───────────────────────────────────────────────
      .addCase(getAssignmentStatus.fulfilled, (state, action: PayloadAction<AssignmentStatus>) => {
        const index = state.assignments.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.assignments[index].status = action.payload.status;
          if (action.payload.submitted_at) {
            state.assignments[index].submitted_at = action.payload.submitted_at;
          }
        }
        if (state.activeAssignment?.id === action.payload.id) {
          state.activeAssignment.status = action.payload.status;
          if (action.payload.submitted_at) {
            state.activeAssignment.submitted_at = action.payload.submitted_at;
          }
        }
      })

      // ── getAssignmentSummary ──────────────────────────────────────────────
      .addCase(getAssignmentSummary.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAssignmentSummary.fulfilled, (state, action: PayloadAction<AssignmentSummary>) => {
        state.isLoading = false;
        state.summary = action.payload;
      })
      .addCase(getAssignmentSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearUserAssignmentError,
  resetUserAssignmentSuccess,
  clearActiveAssignment,
  updateLocalAnswers,
  updateMatrixCell,
  initializeMatrixField,
} = userAssignmentSlice.actions;

export default userAssignmentSlice.reducer;