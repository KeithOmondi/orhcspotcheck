// src/store/slices/assignmentSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { Station } from './stationSlice';

// ─── TYPES ──────────────────────────────────────────────────────────────

export interface FormField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  dependsOn?: { field: string; value: unknown };
  subFields?: FormField[];
  columns?: string[];
  rows?: Record<string, unknown>[];
}

export interface Assignment {
  id: number;
  component_id: number;
  component_name: string;
  user_id: number;
  user_email: string;
  user_full_name: string;
  assigned_by: number;
  assigned_by_email: string;
  assigned_by_name: string;
  status: 'pending' | 'in_progress' | 'submitted';
  assigned_at: string;
  submitted_at?: string;
  answers?: Record<string, unknown>;
  form_json?: { fields: FormField[] };
}

export interface UserAssignment {
  id: number;
  component_id: number;
  component_name: string;
  component_section: string;
  status: 'pending' | 'in_progress' | 'submitted';
  assigned_at: string;
  submitted_at?: string;
  assigned_by_name: string;
}

export interface UserAssignmentDetail extends UserAssignment {
  answers?: Record<string, unknown>;
  form_json: { fields: FormField[] };
}

interface AssignmentState {
  // Admin assignments
  assignments: Assignment[];
  activeAssignment: Assignment | null;

  // User assignments
  myAssignments: UserAssignment[];
  activeMyAssignment: UserAssignmentDetail | null;

  // Station (user-scoped)
  myStation: Station | null;
  isLoadingMyStation: boolean;

  // UI state
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  actionSuccess: boolean;
}

const initialState: AssignmentState = {
  assignments: [],
  activeAssignment: null,
  myAssignments: [],
  activeMyAssignment: null,
  myStation: null,
  isLoadingMyStation: false,
  isLoading: false,
  isSaving: false,
  error: null,
  actionSuccess: false,
};

const ADMIN_BASE = '/spotcheck-admin/assignments';
const USER_BASE  = '/user';

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const { response } = error as { response?: { data?: { message?: string } } };
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
};

// ─── ADMIN ASSIGNMENT THUNKS ─────────────────────────────────────────────

export const fetchAssignments = createAsyncThunk<
  Assignment[],
  { user_id?: number; component_id?: number; status?: string; station_id?: number }
>('assignment/fetchAssignments', async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params.user_id)      query.append('user_id',      params.user_id.toString());
    if (params.component_id) query.append('component_id', params.component_id.toString());
    if (params.status)       query.append('status',       params.status);
    if (params.station_id)   query.append('station_id',   params.station_id.toString());
    const url = query.toString() ? `${ADMIN_BASE}/get?${query}` : `${ADMIN_BASE}/get`;
    const { data } = await axiosClient.get(url);
    return data.assignments as Assignment[];
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchAssignmentById = createAsyncThunk<Assignment, number>(
  'assignment/fetchAssignmentById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${ADMIN_BASE}/get/${id}`);
      return data.assignment as Assignment;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createAssignment = createAsyncThunk<
  Assignment,
  { component_id: number; user_id: number }
>('assignment/createAssignment', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.post(`${ADMIN_BASE}/create`, payload);
    return data.assignment as Assignment;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const updateAssignment = createAsyncThunk<
  Assignment,
  { id: number; status?: 'pending' | 'in_progress' | 'submitted'; user_id?: number; answers?: Record<string, unknown> }
>('assignment/updateAssignment', async ({ id, status, user_id, answers }, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.patch(`${ADMIN_BASE}/update/${id}`, { status, user_id, answers });
    return data.assignment as Assignment;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const deleteAssignment = createAsyncThunk<number, number>(
  'assignment/deleteAssignment',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`${ADMIN_BASE}/delete/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);



export const fetchMyAssignments = createAsyncThunk<
  UserAssignment[],
  { status?: 'pending' | 'in_progress' | 'submitted' } | void
>('assignment/fetchMyAssignments', async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    const url = query.toString() ? `${USER_BASE}/assignments?${query}` : `${USER_BASE}/assignments`;
    const { data } = await axiosClient.get(url);
    return data.assignments as UserAssignment[];
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchMyAssignmentById = createAsyncThunk<UserAssignmentDetail, number>(
  'assignment/fetchMyAssignmentById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${USER_BASE}/assignments/${id}`);
      return data.assignment as UserAssignmentDetail;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const saveMyAssignmentAnswers = createAsyncThunk<
  Pick<UserAssignmentDetail, 'id' | 'status' | 'answers'>,
  { id: number; answers: Record<string, unknown> }
>('assignment/saveMyAssignmentAnswers', async ({ id, answers }, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.patch(`${USER_BASE}/assignments/${id}/save`, { answers });
    return data.assignment;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const submitMyAssignment = createAsyncThunk<
  UserAssignmentDetail,
  { id: number; answers: Record<string, unknown> }
>('assignment/submitMyAssignment', async ({ id, answers }, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.post(`${USER_BASE}/assignments/${id}/submit`, { answers });
    return data.assignment as UserAssignmentDetail;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

// ─── SLICE ──────────────────────────────────────────────────────────────

const assignmentSlice = createSlice({
  name: 'assignment',
  initialState,
  reducers: {
    clearAssignmentError: (state) => {
      state.error = null;
    },
    resetAssignmentSuccess: (state) => {
      state.actionSuccess = false;
    },
    clearActiveAssignment: (state) => {
      state.activeAssignment = null;
    },
    clearActiveMyAssignment: (state) => {
      state.activeMyAssignment = null;
    },
  },
  extraReducers: (builder) => {
    builder

  

      // ── Fetch Assignments (Admin) ───────────────────────────────────────
      .addCase(fetchAssignments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.assignments = action.payload;
      })
      .addCase(fetchAssignments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ── Fetch Assignment By ID (Admin) ──────────────────────────────────
      .addCase(fetchAssignmentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAssignmentById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeAssignment = action.payload;
      })
      .addCase(fetchAssignmentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ── Create Assignment ───────────────────────────────────────────────
      .addCase(createAssignment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        state.assignments.unshift(action.payload);
      })
      .addCase(createAssignment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ── Update Assignment ───────────────────────────────────────────────
      .addCase(updateAssignment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(updateAssignment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        const index = state.assignments.findIndex(a => a.id === action.payload.id);
        if (index !== -1) state.assignments[index] = action.payload;
        if (state.activeAssignment?.id === action.payload.id) state.activeAssignment = action.payload;
      })
      .addCase(updateAssignment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ── Delete Assignment ───────────────────────────────────────────────
      .addCase(deleteAssignment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(deleteAssignment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        state.assignments = state.assignments.filter(a => a.id !== action.payload);
        if (state.activeAssignment?.id === action.payload) state.activeAssignment = null;
      })
      .addCase(deleteAssignment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ── Fetch My Assignments (User) ─────────────────────────────────────
      .addCase(fetchMyAssignments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyAssignments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myAssignments = action.payload;
      })
      .addCase(fetchMyAssignments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ── Fetch My Assignment By ID (User) ────────────────────────────────
      .addCase(fetchMyAssignmentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyAssignmentById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeMyAssignment = action.payload;
        const index = state.myAssignments.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.myAssignments[index] = { ...state.myAssignments[index], status: action.payload.status };
        }
      })
      .addCase(fetchMyAssignmentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ── Save My Assignment Answers ──────────────────────────────────────
      .addCase(saveMyAssignmentAnswers.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(saveMyAssignmentAnswers.fulfilled, (state, action) => {
        state.isSaving = false;
        if (state.activeMyAssignment?.id === action.payload.id) {
          state.activeMyAssignment.answers = action.payload.answers;
          state.activeMyAssignment.status  = action.payload.status;
        }
      })
      .addCase(saveMyAssignmentAnswers.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })

      // ── Submit My Assignment ────────────────────────────────────────────
      .addCase(submitMyAssignment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(submitMyAssignment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        state.activeMyAssignment = action.payload;
        const index = state.myAssignments.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.myAssignments[index] = {
            ...state.myAssignments[index],
            status: 'submitted',
            submitted_at: action.payload.submitted_at,
          };
        }
      })
      .addCase(submitMyAssignment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearAssignmentError,
  resetAssignmentSuccess,
  clearActiveAssignment,
  clearActiveMyAssignment,
} = assignmentSlice.actions;

export default assignmentSlice.reducer;