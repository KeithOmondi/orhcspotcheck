// src/store/slices/userAssignmentSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';

// ─── TYPES ──────────────────────────────────────────────────────────────

export interface MatrixRowValue {
  col0?: string; // First data column (Register in use)
  col1?: string; // Second data column (Continuously updated)
  col2?: string; // Third data column (Reviewed/checked)
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

  // PDF form extras
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
  // List view
  assignments: UserAssignment[];
  activeAssignment: UserAssignmentDetail | null;
  summary: AssignmentSummary | null;
  
  // UI State
  isLoading: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  error: string | null;
  actionSuccess: boolean;
}

const initialState: UserAssignmentState = {
  assignments: [],
  activeAssignment: null,
  summary: null,
  isLoading: false,
  isSaving: false,
  isSubmitting: false,
  error: null,
  actionSuccess: false,
};

// Match the backend route prefix from app.use('/api/v1/user', userAssignmentRoutes)
const USER_BASE = '/user';

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const { response } = error as { response?: { data?: { message?: string } } };
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
};

// ─── MATRIX HELPER FUNCTIONS ──────────────────────────────────────────────

/**
 * Initialize empty matrix data structure for a matrix field
 */
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
      colspan: row.colspan
    };
  });
  
  return matrixData;
};

/**
 * Update a specific cell in a matrix field
 */
export const updateMatrixCellValue = (
  matrixData: MatrixData,
  rowKey: string,
  colIndex: number,
  value: string
): MatrixData => {
  if (!matrixData[rowKey]) return matrixData;
  
  return {
    ...matrixData,
    [rowKey]: {
      ...matrixData[rowKey],
      values: {
        ...matrixData[rowKey].values,
        [`col${colIndex}`]: value
      }
    }
  };
};

/**
 * Get all rows for a specific section (including children)
 */
export const getRowsBySection = (matrixData: MatrixData, sectionName: string): string[] => {
  const sectionKey = `section_${sectionName.replace(/\s+/g, '_')}`;
  if (!matrixData[sectionKey]) return [];
  
  const rows: string[] = [];
  let foundSection = false;
  
  for (const [rowKey, row] of Object.entries(matrixData)) {
    if (rowKey === sectionKey) {
      foundSection = true;
    } else if (foundSection && row.parentSection === sectionName) {
      rows.push(rowKey);
    } else if (foundSection && row.type === 'section') {
      foundSection = false;
    }
  }
  
  return rows;
};

/**
 * Check if a matrix field has any answers
 */
export const hasMatrixAnswers = (matrixData: MatrixData | null | undefined): boolean => {
  if (!matrixData) return false;
  
  return Object.values(matrixData).some((row: MatrixRow) => {
    if (row.type === 'section') return false;
    const values = row.values;
    return !!(values && (values.col0 || values.col1 || values.col2));
  });
};

/**
 * Validate matrix field for required columns
 */
export const validateMatrixField = (
  matrixData: MatrixData | null | undefined,
  requiredColumns?: number[]
): { isValid: boolean; missingFields: string[] } => {
  if (!matrixData) return { isValid: true, missingFields: [] };
  
  const missingFields: string[] = [];
  const colsToCheck = requiredColumns || [0, 1, 2]; // Default check all columns
  
  // Remove the unused 'rowKey' parameter by using just the value
  Object.values(matrixData).forEach((row: MatrixRow) => {
    if (row.type === 'section') return;
    
    colsToCheck.forEach((colIdx: number) => {
      const colKey = `col${colIdx}`;
      const value = row.values?.[colKey];
      if (!value || value.trim() === '') {
        missingFields.push(`${row.label} - Column ${colIdx + 1}`);
      }
    });
  });
  
  return { isValid: missingFields.length === 0, missingFields };
};

// ─── THUNKS ──────────────────────────────────────────────────────────────

/**
 * Fetch all assignments for the current user
 * Optional: filter by status (pending, in_progress, submitted)
 */
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

/**
 * Fetch a single assignment by ID with full form_json for filling
 */
export const fetchMyAssignmentById = createAsyncThunk<
  UserAssignmentDetail,
  number
>('userAssignment/fetchMyAssignmentById', async (id, { rejectWithValue }) => {
  try {
    console.log(`🔍 Fetching assignment ${id} details`);
    const { data } = await axiosClient.get(`${USER_BASE}/assignments/${id}`);
    console.log(`✅ Assignment ${id} loaded:`, data.assignment.component_name);
    
    // Ensure matrix fields have proper structure
    const assignment = data.assignment as UserAssignmentDetail;
    if (assignment.form_json?.fields) {
      assignment.form_json.fields.forEach((field: FormField) => {
        if (field.type === 'matrix' && !assignment.answers?.[field.id]) {
          // Initialize empty matrix if not exists
          if (!assignment.answers) assignment.answers = {};
          assignment.answers[field.id] = initializeMatrixData(field);
        }
      });
    }
    
    return assignment;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

/**
 * Save draft answers without submitting
 */
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

/**
 * Submit final answers with validation
 */
export const submitAssignment = createAsyncThunk<
  UserAssignmentDetail,
  { id: number; answers: Record<string, unknown>; validateMatrix?: boolean }
>('userAssignment/submitAssignment', async ({ id, answers, validateMatrix = true }, { rejectWithValue }) => {
  try {
    // Optional: Frontend validation before submission
    if (validateMatrix) {
      // Add validation logic here if needed
      console.log(`🔍 Validating assignment ${id} before submission`);
    }
    
    console.log(`📤 Submitting assignment ${id}`);
    const { data } = await axiosClient.post(`${USER_BASE}/assignments/${id}/submit`, { answers });
    console.log(`✅ Assignment ${id} submitted successfully`);
    return data.assignment as UserAssignmentDetail;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

/**
 * Get assignment status only (lightweight)
 */
export const getAssignmentStatus = createAsyncThunk<
  AssignmentStatus,
  number
>('userAssignment/getAssignmentStatus', async (id, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.get(`${USER_BASE}/assignments/${id}/status`);
    return data.status as AssignmentStatus;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

/**
 * Get summary counts by status
 */
export const getAssignmentSummary = createAsyncThunk<
  AssignmentSummary,
  void
>('userAssignment/getAssignmentSummary', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.get(`${USER_BASE}/assignments/summary`);
    console.log('📊 Assignment summary:', data.summary);
    return data.summary as AssignmentSummary;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

// ─── SLICE ──────────────────────────────────────────────────────────────

const userAssignmentSlice = createSlice({
  name: 'userAssignment',
  initialState,
  reducers: {
    clearUserAssignmentError: (state) => {
      state.error = null;
    },
    resetUserAssignmentSuccess: (state) => {
      state.actionSuccess = false;
    },
    clearActiveAssignment: (state) => {
      state.activeAssignment = null;
    },
    updateLocalAnswers: (state, action: PayloadAction<UpdateLocalAnswersPayload>) => {
      const { fieldId, value } = action.payload;
      if (state.activeAssignment) {
        if (!state.activeAssignment.answers) {
          state.activeAssignment.answers = {};
        }
        state.activeAssignment.answers[fieldId] = value;
      }
    },
    // Matrix-specific actions
    updateMatrixCell: (state, action: PayloadAction<UpdateMatrixCellPayload>) => {
      const { fieldId, rowKey, colIndex, value } = action.payload;
      if (state.activeAssignment?.answers) {
        const matrixData = state.activeAssignment.answers[fieldId] as MatrixData;
        if (matrixData) {
          const updatedMatrix = updateMatrixCellValue(matrixData, rowKey, colIndex, value);
          state.activeAssignment.answers[fieldId] = updatedMatrix;
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
      // ── Fetch My Assignments ──────────────────────────────────────────────
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

      // ── Fetch My Assignment By ID ─────────────────────────────────────────
      .addCase(fetchMyAssignmentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyAssignmentById.fulfilled, (state, action: PayloadAction<UserAssignmentDetail>) => {
        state.isLoading = false;
        state.activeAssignment = action.payload;
        
        // Update the status in the list if it changed (pending → in_progress)
        const index = state.assignments.findIndex(a => a.id === action.payload.id);
        if (index !== -1 && state.assignments[index].status !== action.payload.status) {
          state.assignments[index].status = action.payload.status;
        }
      })
      .addCase(fetchMyAssignmentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ── Save Draft ────────────────────────────────────────────────────────
      .addCase(saveAssignmentDraft.pending, (state) => {
        state.isSaving = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(saveAssignmentDraft.fulfilled, (state, action: PayloadAction<SaveDraftResponse>) => {
        state.isSaving = false;
        state.actionSuccess = true;
        
        // Update active assignment answers and status
        if (state.activeAssignment && state.activeAssignment.id === action.payload.id) {
          state.activeAssignment.answers = action.payload.answers;
          state.activeAssignment.status = action.payload.status;
        }
        
        // Update in list
        const index = state.assignments.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          if (state.assignments[index].status !== action.payload.status) {
            state.assignments[index].status = action.payload.status;
          }
        }
      })
      .addCase(saveAssignmentDraft.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
        state.actionSuccess = false;
      })

      // ── Submit Assignment ─────────────────────────────────────────────────
      .addCase(submitAssignment.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(submitAssignment.fulfilled, (state, action: PayloadAction<UserAssignmentDetail>) => {
        state.isSubmitting = false;
        state.actionSuccess = true;
        state.activeAssignment = action.payload;
        
        // Update in list
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

      // ── Get Assignment Status ────────────────────────────────────────────
      .addCase(getAssignmentStatus.fulfilled, (state, action: PayloadAction<AssignmentStatus>) => {
        const index = state.assignments.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.assignments[index].status = action.payload.status;
          if (action.payload.submitted_at) {
            state.assignments[index].submitted_at = action.payload.submitted_at;
          }
        }
        
        if (state.activeAssignment && state.activeAssignment.id === action.payload.id) {
          state.activeAssignment.status = action.payload.status;
          if (action.payload.submitted_at) {
            state.activeAssignment.submitted_at = action.payload.submitted_at;
          }
        }
      })

      // ── Get Assignment Summary ───────────────────────────────────────────
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