// src/store/slices/superAdminSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';

// ─── TYPES ──────────────────────────────────────────────────────────────

export interface Station {
  id: number;
  name: string;
  code: string;
  created_at?: string;
  updated_at?: string;
}

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

export interface MasterComponent {
  id: number;
  name: string;
  section: string;
  form_json: { fields: FormField[] };
  created_at?: string;
  updated_at?: string;
}

export interface SuperAdminAssignment {
  id: number;
  component_id: number;
  component_name: string;
  component_section: string;
  user_id: number;
  user_email: string;
  user_full_name: string;
  user_pj_number: string;
  user_station_id: number;
  station_name: string;
  station_code: string;
  assigned_by: number;
  assigned_by_email: string;
  assigned_by_name: string;
  status: 'pending' | 'in_progress' | 'submitted';
  assigned_at: string;
  submitted_at?: string;
  answers?: Record<string, unknown>;
  form_json?: { fields: FormField[] };
}

export interface AssignmentStats {
  overview: {
    total_assignments: string;
    pending: string;
    in_progress: string;
    submitted: string;
    stations_with_assignments: string;
    unique_inspectors: string;
  };
  byStation: Array<{
    id: number;
    name: string;
    code: string;
    total_assignments: string;
    pending: string;
    in_progress: string;
    submitted: string;
  }>;
  timeline: Array<{
    date: string;
    total: string;
    submitted: string;
  }>;
}

interface SuperAdminState {
  // Stations
  stations: Station[];
  activeStation: Station | null;
  
  // Master Components
  masterComponents: MasterComponent[];
  activeMasterComponent: MasterComponent | null;
  masterSections: string[];
  
  // Assignments (read-only)
  allAssignments: SuperAdminAssignment[];
  activeAssignment: SuperAdminAssignment | null;
  assignmentStats: AssignmentStats | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  actionSuccess: boolean;
}

const initialState: SuperAdminState = {
  stations: [],
  activeStation: null,
  masterComponents: [],
  activeMasterComponent: null,
  masterSections: [],
  allAssignments: [],
  activeAssignment: null,
  assignmentStats: null,
  isLoading: false,
  error: null,
  actionSuccess: false,
};

const SUPER_ADMIN_BASE = '/super-admin';

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const { response } = error as { response?: { data?: { message?: string } } };
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
};

// ─── STATION THUNKS ──────────────────────────────────────────────────────

export const fetchStations = createAsyncThunk<Station[], void>(
  'superAdmin/fetchStations',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${SUPER_ADMIN_BASE}/stations/get`);
      console.log('📦 Stations fetched:', data.data?.length || 0);
      return data.data as Station[];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchStationById = createAsyncThunk<Station, number>(
  'superAdmin/fetchStationById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${SUPER_ADMIN_BASE}/stations/get/${id}`);
      return data.data as Station;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createStation = createAsyncThunk<Station, { name: string; code: string }>(
  'superAdmin/createStation',
  async (stationData, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post(`${SUPER_ADMIN_BASE}/stations/create`, stationData);
      console.log('✅ Station created:', data.data.name);
      return data.data as Station;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateStation = createAsyncThunk<Station, { id: number; name?: string; code?: string }>(
  'superAdmin/updateStation',
  async ({ id, ...fields }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.patch(`${SUPER_ADMIN_BASE}/stations/update/${id}`, fields);
      console.log('✅ Station updated:', data.data.name);
      return data.data as Station;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteStation = createAsyncThunk<number, number>(
  'superAdmin/deleteStation',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`${SUPER_ADMIN_BASE}/stations/delete/${id}`);
      console.log('🗑️ Station deleted:', id);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ─── MASTER COMPONENT THUNKS ────────────────────────────────────────────

export const fetchMasterComponents = createAsyncThunk<MasterComponent[], { section?: string }>(
  'superAdmin/fetchMasterComponents',
  async (params, { rejectWithValue }) => {
    try {
      const query = params.section ? `?section=${encodeURIComponent(params.section)}` : '';
      const { data } = await axiosClient.get(`${SUPER_ADMIN_BASE}/components/get${query}`);
      console.log('📦 Master components fetched:', data.data?.length || 0);
      return data.data as MasterComponent[];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchMasterComponentById = createAsyncThunk<MasterComponent, number>(
  'superAdmin/fetchMasterComponentById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${SUPER_ADMIN_BASE}/components/get/${id}`);
      return data.data as MasterComponent;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchMasterComponentSections = createAsyncThunk<string[], void>(
  'superAdmin/fetchMasterComponentSections',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${SUPER_ADMIN_BASE}/components/sections`);
      console.log('📂 Master sections:', data.data?.length || 0);
      return data.data as string[];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createMasterComponent = createAsyncThunk<
  MasterComponent,
  { name: string; section: string; form_json: { fields: FormField[] } }
>('superAdmin/createMasterComponent', async (componentData, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.post(`${SUPER_ADMIN_BASE}/components/create`, componentData);
    console.log('✅ Master component created:', data.data.name);
    return data.data as MasterComponent;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const updateMasterComponent = createAsyncThunk<
  MasterComponent,
  { id: number; name?: string; section?: string; form_json?: { fields: FormField[] } }
>('superAdmin/updateMasterComponent', async ({ id, ...fields }, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.patch(`${SUPER_ADMIN_BASE}/components/update/${id}`, fields);
    console.log('✅ Master component updated:', data.data.name);
    return data.data as MasterComponent;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const deleteMasterComponent = createAsyncThunk<number, number>(
  'superAdmin/deleteMasterComponent',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`${SUPER_ADMIN_BASE}/components/delete/${id}`);
      console.log('🗑️ Master component deleted:', id);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ─── ASSIGNMENT THUNKS (READ-ONLY) ──────────────────────────────────────

export const fetchAllAssignments = createAsyncThunk<
  SuperAdminAssignment[],
  { station_id?: number; user_id?: number; component_id?: number; status?: string }
>('superAdmin/fetchAllAssignments', async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params.station_id) query.append('station_id', params.station_id.toString());
    if (params.user_id) query.append('user_id', params.user_id.toString());
    if (params.component_id) query.append('component_id', params.component_id.toString());
    if (params.status) query.append('status', params.status);
    
    const url = query.toString() 
      ? `${SUPER_ADMIN_BASE}/assignments?${query}`
      : `${SUPER_ADMIN_BASE}/assignments`;
    
    const { data } = await axiosClient.get(url);
    console.log('📦 All assignments fetched:', data.assignments?.length || 0);
    return data.assignments as SuperAdminAssignment[];
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchAssignmentById = createAsyncThunk<SuperAdminAssignment, number>(
  'superAdmin/fetchAssignmentById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${SUPER_ADMIN_BASE}/assignments/${id}`);
      return data.assignment as SuperAdminAssignment;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchAssignmentStats = createAsyncThunk<AssignmentStats, void>(
  'superAdmin/fetchAssignmentStats',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${SUPER_ADMIN_BASE}/assignments/stats/overview`);
      return data.stats as AssignmentStats;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const exportAssignments = createAsyncThunk<
  Blob,
  { format?: 'json' | 'csv'; station_id?: number; status?: string }
>('superAdmin/exportAssignments', async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    query.append('format', params.format || 'json');
    if (params.station_id) query.append('station_id', params.station_id.toString());
    if (params.status) query.append('status', params.status);
    
    const response = await axiosClient.get(`${SUPER_ADMIN_BASE}/assignments/export?${query}`, {
      responseType: 'blob',
    });
    
    return response.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

// ─── SLICE ──────────────────────────────────────────────────────────────

const superAdminSlice = createSlice({
  name: 'superAdmin',
  initialState,
  reducers: {
    clearSuperAdminError: (state) => {
      state.error = null;
    },
    resetSuperAdminSuccess: (state) => {
      state.actionSuccess = false;
    },
    clearActiveStation: (state) => {
      state.activeStation = null;
    },
    clearActiveMasterComponent: (state) => {
      state.activeMasterComponent = null;
    },
    clearActiveAssignment: (state) => {
      state.activeAssignment = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Stations ────────────────────────────────────────────────────────
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

      .addCase(fetchStationById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStationById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeStation = action.payload;
      })
      .addCase(fetchStationById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(createStation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(createStation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        state.stations.push(action.payload);
      })
      .addCase(createStation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(updateStation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(updateStation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        const index = state.stations.findIndex(s => s.id === action.payload.id);
        if (index !== -1) state.stations[index] = action.payload;
        if (state.activeStation?.id === action.payload.id) state.activeStation = action.payload;
      })
      .addCase(updateStation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(deleteStation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(deleteStation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        state.stations = state.stations.filter(s => s.id !== action.payload);
        if (state.activeStation?.id === action.payload) state.activeStation = null;
      })
      .addCase(deleteStation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ── Master Components ───────────────────────────────────────────────
      .addCase(fetchMasterComponents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMasterComponents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.masterComponents = action.payload;
      })
      .addCase(fetchMasterComponents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchMasterComponentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMasterComponentById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeMasterComponent = action.payload;
      })
      .addCase(fetchMasterComponentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchMasterComponentSections.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMasterComponentSections.fulfilled, (state, action) => {
        state.isLoading = false;
        state.masterSections = action.payload;
      })
      .addCase(fetchMasterComponentSections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(createMasterComponent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(createMasterComponent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        state.masterComponents.push(action.payload);
      })
      .addCase(createMasterComponent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(updateMasterComponent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(updateMasterComponent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        const index = state.masterComponents.findIndex(c => c.id === action.payload.id);
        if (index !== -1) state.masterComponents[index] = action.payload;
        if (state.activeMasterComponent?.id === action.payload.id) state.activeMasterComponent = action.payload;
      })
      .addCase(updateMasterComponent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(deleteMasterComponent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(deleteMasterComponent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        state.masterComponents = state.masterComponents.filter(c => c.id !== action.payload);
        if (state.activeMasterComponent?.id === action.payload) state.activeMasterComponent = null;
      })
      .addCase(deleteMasterComponent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ─── Assignments (Read-Only) ────────────────────────────────────────
      .addCase(fetchAllAssignments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllAssignments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allAssignments = action.payload;
      })
      .addCase(fetchAllAssignments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

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

      .addCase(fetchAssignmentStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAssignmentStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.assignmentStats = action.payload;
      })
      .addCase(fetchAssignmentStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearSuperAdminError,
  resetSuperAdminSuccess,
  clearActiveStation,
  clearActiveMasterComponent,
  clearActiveAssignment,
} = superAdminSlice.actions;

export default superAdminSlice.reducer;