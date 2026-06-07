// src/store/slices/submissionSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface Submission {
  id: number;
  component_id: number;
  user_id: number;
  status: 'submitted';
  assigned_at: string;
  submitted_at: string;
  updated_at: string;
  component_name: string;
  component_section: string;
  inspector_name: string;
  inspector_email: string;
  assigned_by_name: string;
  assigned_by_email: string;
}

export interface SubmissionDetail extends Submission {
  form_json: { fields: unknown[] } | null;
  answers: Record<string, unknown> | null;
}

export interface SubmissionFilters {
  component_id?: number;
  user_id?: number;
  section?: string;
}

interface SubmissionState {
  submissions: Submission[];
  activeSubmission: SubmissionDetail | null;
  count: number;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;
}

const initialState: SubmissionState = {
  submissions: [],
  activeSubmission: null,
  count: 0,
  isLoading: false,
  isLoadingDetail: false,
  error: null,
};

// ← updated to match app.use('/api/v1/submissions', ...) + router.get('/get', ...)
const SUBMISSIONS_BASE = '/submissions';

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const { response } = error as { response?: { data?: { message?: string } } };
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
};

// ─── THUNKS ──────────────────────────────────────────────────────────────────

export const fetchSubmissions = createAsyncThunk <
  { submissions: Submission[]; count: number },
  SubmissionFilters
>(
  'submission/fetchAll',
  async (filters, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.component_id) params.set('component_id', String(filters.component_id));
      if (filters.user_id)      params.set('user_id',      String(filters.user_id));
      if (filters.section)      params.set('section',      filters.section);

      const query = params.toString() ? `?${params.toString()}` : '';
      const url   = `${SUBMISSIONS_BASE}/get${query}`;
      console.log('📋 Fetching submissions from:', url);

      const { data } = await axiosClient.get(url);
      console.log(`✅ Submissions fetched: ${data.count}`);
      return { submissions: data.submissions as Submission[], count: data.count as number };
    } catch (error) {
      console.error('❌ Fetch submissions error:', getErrorMessage(error));
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchSubmissionById = createAsyncThunk<SubmissionDetail, number>(
  'submission/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const url = `${SUBMISSIONS_BASE}/get/${id}`;
      console.log('📋 Fetching submission detail:', url);

      const { data } = await axiosClient.get(url);
      console.log('✅ Submission detail fetched:', data.submission.component_name);
      return data.submission as SubmissionDetail;
    } catch (error) {
      console.error('❌ Fetch submission by ID error:', getErrorMessage(error));
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ─── SLICE ───────────────────────────────────────────────────────────────────

const submissionSlice = createSlice({
  name: 'submission',
  initialState,
  reducers: {
    clearSubmissionError:  (state) => { state.error = null; },
    clearActiveSubmission: (state) => { state.activeSubmission = null; },
    clearSubmissions:      (state) => { state.submissions = []; state.count = 0; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubmissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubmissions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.submissions = action.payload.submissions;
        state.count = action.payload.count;
        console.log(`📦 Loaded ${state.count} submissions into store`);
      })
      .addCase(fetchSubmissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        console.error('❌ fetchSubmissions rejected:', state.error);
      })

      .addCase(fetchSubmissionById.pending, (state) => {
        state.isLoadingDetail = true;
        state.error = null;
      })
      .addCase(fetchSubmissionById.fulfilled, (state, action) => {
        state.isLoadingDetail = false;
        state.activeSubmission = action.payload;
        console.log('✅ Active submission set:', action.payload.component_name);
      })
      .addCase(fetchSubmissionById.rejected, (state, action) => {
        state.isLoadingDetail = false;
        state.error = action.payload as string;
        console.error('❌ fetchSubmissionById rejected:', state.error);
      });
  },
});

export const {
  clearSubmissionError,
  clearActiveSubmission,
  clearSubmissions,
} = submissionSlice.actions;

export default submissionSlice.reducer;