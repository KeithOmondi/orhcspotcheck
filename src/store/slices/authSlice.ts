// src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import axiosClient from '../../api/api';

export type UserRole = 'super_admin' | 'admin' | 'user';

export interface UserMetadata {
  id          : string;
  email       : string;
  role        : UserRole;
  full_name   : string;
  pj_number   : string;
  station_id  : number | null;   // 'user' role — single station
  station_ids : number[];        // 'admin' role — up to 5 stations
}

interface AuthState {
  user              : UserMetadata | null;
  accessToken       : string | null;
  isLoading         : boolean;
  error             : string | null;
  otpRequested      : boolean;
  isInitializing    : boolean;
  createUserSuccess : boolean;
}

const initialState: AuthState = {
  user              : null,
  accessToken       : null,
  isLoading         : false,
  error             : null,
  otpRequested      : false,
  isInitializing    : true,
  createUserSuccess : false,
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message || 'Request failed';
  }
  if (error instanceof Error) return error.message;
  return 'An unknown error occurred';
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const requestOtp = createAsyncThunk(
  'auth/requestOtp',
  async (pj_number: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/auth/login/request', { pj_number });
      return response.data.message;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (payload: { pj_number: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/auth/login/verify', payload);
      return response.data as { accessToken: string; user: UserMetadata };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const refreshAccessToken = createAsyncThunk(
  'auth/refreshAccessToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/auth/refresh-token');
      return response.data as { accessToken: string; user: UserMetadata };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await axiosClient.post('/auth/logout');
      return null;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export interface CreateUserPayload {
  full_name   : string;
  email       : string;
  pj_number   : string;
  role?       : UserRole;
  station_id? : number | null;   // for 'user' role
  station_ids?: number[];        // for 'admin' role
}

export const createUser = createAsyncThunk(
  'auth/createUser',
  async (payload: CreateUserPayload, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/auth/users', payload);
      return response.data.data as UserMetadata;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    clearAuth: (state) => {
      state.user         = null;
      state.accessToken  = null;
      state.otpRequested = false;
      state.error        = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCreateUserSuccess: (state) => {
      state.createUserSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Request OTP ────────────────────────────────────────────────────────
      .addCase(requestOtp.pending, (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(requestOtp.fulfilled, (state) => {
        state.isLoading    = false;
        state.otpRequested = true;
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      })

      // ── Verify OTP ─────────────────────────────────────────────────────────
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action: PayloadAction<{ accessToken: string; user: UserMetadata }>) => {
        state.isLoading    = false;
        state.accessToken  = action.payload.accessToken;
        // Normalise: backend always sends station_ids; guard for older tokens
        state.user         = {
          ...action.payload.user,
          station_ids: action.payload.user.station_ids ?? [],
        };
        state.otpRequested = false;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      })

      // ── Refresh Token ──────────────────────────────────────────────────────
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken    = action.payload.accessToken;
        state.user           = {
          ...action.payload.user,
          station_ids: action.payload.user.station_ids ?? [],
        };
        state.isInitializing = false;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        state.user           = null;
        state.accessToken    = null;
        state.isInitializing = false;
      })

      // ── Logout ─────────────────────────────────────────────────────────────
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user         = null;
        state.accessToken  = null;
        state.otpRequested = false;
        state.isLoading    = false;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.user         = null;
        state.accessToken  = null;
        state.otpRequested = false;
        state.isLoading    = false;
      })

      // ── Create User ────────────────────────────────────────────────────────
      .addCase(createUser.pending, (state) => {
        state.isLoading         = true;
        state.error             = null;
        state.createUserSuccess = false;
      })
      .addCase(createUser.fulfilled, (state) => {
        state.isLoading         = false;
        state.createUserSuccess = true;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isLoading         = false;
        state.error             = action.payload as string;
        state.createUserSuccess = false;
      });
  },
});

export const { setAccessToken, clearAuth, clearError, clearCreateUserSuccess } = authSlice.actions;
export default authSlice.reducer;