// src/store/slices/userSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface User {
  id          : number;
  email       : string;
  full_name   : string;
  role        : 'super_admin' | 'admin' | 'user';
  pj_number   : string | null;
  station_id  : number | null;   // 'user' role — single station
  station_ids : number[];        // 'admin' role — up to 5 stations
  created_at  : string;
}

interface UserState {
  users         : User[];
  activeUser    : User | null;
  isLoading     : boolean;
  error         : string | null;
  actionSuccess : boolean;
}

const initialState: UserState = {
  users         : [],
  activeUser    : null,
  isLoading     : false,
  error         : null,
  actionSuccess : false,
};

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const { response } = error as { response?: { data?: { message?: string } } };
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
};

// ─── Normaliser — ensures station_ids is always an array ─────────────────────
const normalise = (u: Omit<User, 'station_ids'> & { station_ids?: number[] }): User => ({
  ...u,
  station_ids: u.station_ids ?? [],
});

// ─── THUNKS ───────────────────────────────────────────────────────────────────

export const fetchUsers = createAsyncThunk<User[], { role?: string } | void>(
  'user/fetchUsers',
  async (params, { rejectWithValue }) => {
    try {
      const query = params?.role ? `?role=${params.role}` : '';
      const { data } = await axiosClient.get(`/user/get${query}`);
      return (data.users as User[]).map(normalise);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchUserById = createAsyncThunk<User, number>(
  'user/fetchUserById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/user/get/${id}`);
      return normalise(data.user);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export interface CreateUserData {
  email       : string;
  full_name   : string;
  role        : string;
  pj_number?  : string;
  station_id? : number | null;   // for 'user' role
  station_ids?: number[];        // for 'admin' role
}

export const createUser = createAsyncThunk<User, CreateUserData>(
  'user/createUser',
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post('/user/create', userData);
      return normalise(data.user);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export interface UpdateUserData {
  id          : number;
  email?      : string;
  full_name?  : string;
  role?       : string;
  pj_number?  : string | null;
  station_id? : number | null;
  station_ids?: number[];
}

export const updateUser = createAsyncThunk<User, UpdateUserData>(
  'user/updateUser',
  async ({ id, ...fields }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.patch(`/user/update/${id}`, fields);
      return normalise(data.user);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteUser = createAsyncThunk<number, number>(
  'user/deleteUser',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/user/delete/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ─── SLICE ────────────────────────────────────────────────────────────────────

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUserError: (state) => {
      state.error = null;
    },
    resetUserSuccess: (state) => {
      state.actionSuccess = false;
    },
    clearActiveUser: (state) => {
      state.activeUser = null;
    },
  },
  extraReducers: (builder) => {
    builder

      // ── Fetch Users ──────────────────────────────────────────────────────
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users     = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      })

      // ── Fetch User By ID ─────────────────────────────────────────────────
      .addCase(fetchUserById.pending, (state) => {
        state.isLoading  = true;
        state.error      = null;
        state.activeUser = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.isLoading  = false;
        state.activeUser = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      })

      // ── Create User ──────────────────────────────────────────────────────
      .addCase(createUser.pending, (state) => {
        state.isLoading     = true;
        state.error         = null;
        state.actionSuccess = false;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.isLoading     = false;
        state.actionSuccess = true;
        state.users.unshift(action.payload);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      })

      // ── Update User ──────────────────────────────────────────────────────
      .addCase(updateUser.pending, (state) => {
        state.isLoading     = true;
        state.error         = null;
        state.actionSuccess = false;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.isLoading     = false;
        state.actionSuccess = true;
        const index = state.users.findIndex(u => u.id === action.payload.id);
        if (index !== -1) state.users[index] = action.payload;
        if (state.activeUser?.id === action.payload.id) state.activeUser = action.payload;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      })

      // ── Delete User ──────────────────────────────────────────────────────
      .addCase(deleteUser.pending, (state) => {
        state.isLoading     = true;
        state.error         = null;
        state.actionSuccess = false;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.isLoading     = false;
        state.actionSuccess = true;
        state.users         = state.users.filter(u => u.id !== action.payload);
        if (state.activeUser?.id === action.payload) state.activeUser = null;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      });
  },
});

export const { clearUserError, resetUserSuccess, clearActiveUser } = userSlice.actions;
export default userSlice.reducer;