// src/store/slices/stationSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Station {
  id: number;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

interface StationState {
  stations: Station[];
  activeStation: Station | null;
  isLoading: boolean;
  error: string | null;
  actionSuccess: boolean;
}

const initialState: StationState = {
  stations: [],
  activeStation: null,
  isLoading: false,
  error: null,
  actionSuccess: false,
};

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const { response } = error as { response?: { data?: { message?: string } } };
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchStations = createAsyncThunk<Station[], void>(
  'station/fetchStations',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get('/super-admin/stations/get');
      return data.data as Station[];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchStationById = createAsyncThunk<Station, number>(
  'station/fetchStationById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/super-admin/stations/get/${id}`);
      return data.data as Station;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createStation = createAsyncThunk<
  Station,
  { name: string; code: string }
>('station/createStation', async (stationData, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.post('/super-admin/stations/create', stationData);
    return data.data as Station;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const updateStation = createAsyncThunk<
  Station,
  { id: number; name?: string; code?: string }
>('station/updateStation', async ({ id, ...fields }, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.patch(`/super-admin/stations/update/${id}`, fields);
    return data.data as Station;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const deleteStation = createAsyncThunk<number, number>(
  'station/deleteStation',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/super-admin/stations/delete/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const stationSlice = createSlice({
  name: 'station',
  initialState,
  reducers: {
    clearStationError: (state) => {
      state.error = null;
    },
    resetStationSuccess: (state) => {
      state.actionSuccess = false;
    },
    clearActiveStation: (state) => {
      state.activeStation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchStations
      .addCase(fetchStations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stations = action.payload;
      })
      .addCase(fetchStations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // fetchStationById
      .addCase(fetchStationById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.activeStation = null;
      })
      .addCase(fetchStationById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeStation = action.payload;
      })
      .addCase(fetchStationById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // createStation
      .addCase(createStation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(createStation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        state.stations.unshift(action.payload); // newest first
      })
      .addCase(createStation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // updateStation
      .addCase(updateStation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(updateStation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        const index = state.stations.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) state.stations[index] = action.payload;
        if (state.activeStation?.id === action.payload.id) state.activeStation = action.payload;
      })
      .addCase(updateStation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // deleteStation
      .addCase(deleteStation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(deleteStation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        state.stations = state.stations.filter((s) => s.id !== action.payload);
        if (state.activeStation?.id === action.payload) state.activeStation = null;
      })
      .addCase(deleteStation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearStationError, resetStationSuccess, clearActiveStation } = stationSlice.actions;
export default stationSlice.reducer;