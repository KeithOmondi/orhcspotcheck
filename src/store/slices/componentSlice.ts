// src/store/slices/componentSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';

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

export interface Component {
  id: number;
  name: string;
  section: string;
  form_json: { fields: FormField[] };
  created_at?: string;
  updated_at?: string;
}

interface ComponentState {
  components: Component[];
  activeComponent: Component | null;
  sections: string[];
  isLoading: boolean;
  error: string | null;
  actionSuccess: boolean;
}

const initialState: ComponentState = {
  components: [],
  activeComponent: null,
  sections: [],
  isLoading: false,
  error: null,
  actionSuccess: false,
};

const ADMIN_BASE = '/spotcheck-admin/components';

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const { response } = error as { response?: { data?: { message?: string } } };
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
};

// ─── THUNKS ──────────────────────────────────────────────────────────────

export const fetchComponents = createAsyncThunk <
  Component[],
  { section?: string; station_id?: number }  // ← add station_id
>(
  'component/fetchComponents',
  async (params, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      if (params.section)    query.append('section',    encodeURIComponent(params.section));
      if (params.station_id) query.append('station_id', params.station_id.toString());

      const url = query.toString()
        ? `${ADMIN_BASE}/get?${query}`
        : `${ADMIN_BASE}/get`;

      console.log('🔍 Fetching components from:', url);
      const { data } = await axiosClient.get(url);

      if (!data.components || !Array.isArray(data.components)) {
        console.warn('⚠️ No components array in response:', data);
        return [];
      }

      return data.components as Component[];
    } catch (error) {
      const err = error as { response?: { status?: number; statusText?: string; data?: { message?: string } }; config?: { url?: string } };
      console.error('❌ Components fetch error:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        url: err.config?.url,
      });
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchComponentById = createAsyncThunk<Component, number>(
  'component/fetchComponentById',
  async (id, { rejectWithValue }) => {
    try {
      const url = `${ADMIN_BASE}/get/${id}`;
      console.log('🔍 Fetching component by ID:', url);
      
      const { data } = await axiosClient.get(url);
      
      if (!data.component) {
        console.warn('⚠️ No component found for ID:', id);
        return rejectWithValue('Component not found');
      }
      
      console.log('✅ Component fetched:', data.component.name);
      return data.component as Component;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('❌ Fetch component by ID error:', err.response?.data?.message);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchComponentSections = createAsyncThunk<string[], void>(
  'component/fetchComponentSections',
  async (_, { rejectWithValue }) => {
    try {
      const url = `${ADMIN_BASE}/sections`;
      console.log('🔍 Fetching component sections from:', url);
      
      const { data } = await axiosClient.get(url);
      console.log('📂 Component sections:', data.sections?.length || 0, 'sections found');
      
      return data.sections as string[];
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('❌ Fetch sections error:', err.response?.data?.message);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createComponent = createAsyncThunk<Component, { name: string; section: string; form_json: { fields: FormField[] } }>(
  'component/createComponent',
  async (componentData, { rejectWithValue }) => {
    try {
      console.log('📝 Creating component:', componentData.name);
      const { data } = await axiosClient.post(`${ADMIN_BASE}/create`, componentData);
      console.log('✅ Component created:', data.component.name);
      return data.component as Component;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('❌ Create component error:', err.response?.data?.message);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateComponent = createAsyncThunk<
  Component,
  { id: number; name?: string; section?: string; form_json?: { fields: FormField[] } }
>('component/updateComponent', async ({ id, ...fields }, { rejectWithValue }) => {
  try {
    console.log('✏️ Updating component:', id);
    const { data } = await axiosClient.patch(`${ADMIN_BASE}/update/${id}`, fields);
    console.log('✅ Component updated:', data.component.name);
    return data.component as Component;
  } catch (error) {
    const err = error as { response?: { data?: { message?: string } } };
    console.error('❌ Update component error:', err.response?.data?.message);
    return rejectWithValue(getErrorMessage(error));
  }
});

export const deleteComponent = createAsyncThunk<number, number>(
  'component/deleteComponent',
  async (id, { rejectWithValue }) => {
    try {
      console.log('🗑️ Deleting component:', id);
      await axiosClient.delete(`${ADMIN_BASE}/delete/${id}`);
      console.log('✅ Component deleted:', id);
      return id;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('❌ Delete component error:', err.response?.data?.message);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ─── SLICE ──────────────────────────────────────────────────────────────

const componentSlice = createSlice({
  name: 'component',
  initialState,
  reducers: {
    clearComponentError: (state) => {
      state.error = null;
    },
    resetComponentSuccess: (state) => {
      state.actionSuccess = false;
    },
    clearActiveComponent: (state) => {
      state.activeComponent = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Components
      .addCase(fetchComponents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchComponents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.components = action.payload;
        console.log(`📦 Loaded ${state.components.length} components into store`);
      })
      .addCase(fetchComponents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        console.error('❌ Fetch components rejected:', state.error);
      })

      // Fetch Component By ID
      .addCase(fetchComponentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchComponentById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeComponent = action.payload;
        console.log('✅ Active component set:', action.payload.name);
      })
      .addCase(fetchComponentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Component Sections
      .addCase(fetchComponentSections.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchComponentSections.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sections = action.payload;
        console.log(`📂 Loaded ${state.sections.length} sections into store`);
      })
      .addCase(fetchComponentSections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Create Component
      .addCase(createComponent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(createComponent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        state.components.push(action.payload);
        console.log('✅ Component added to state, total:', state.components.length);
      })
      .addCase(createComponent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Update Component
      .addCase(updateComponent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(updateComponent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        const index = state.components.findIndex(c => c.id === action.payload.id);
        if (index !== -1) state.components[index] = action.payload;
        if (state.activeComponent?.id === action.payload.id) state.activeComponent = action.payload;
        console.log('✅ Component updated in state');
      })
      .addCase(updateComponent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Delete Component
      .addCase(deleteComponent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.actionSuccess = false;
      })
      .addCase(deleteComponent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.actionSuccess = true;
        state.components = state.components.filter(c => c.id !== action.payload);
        if (state.activeComponent?.id === action.payload) state.activeComponent = null;
        console.log('✅ Component deleted from state, remaining:', state.components.length);
      })
      .addCase(deleteComponent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearComponentError, resetComponentSuccess, clearActiveComponent } = componentSlice.actions;
export default componentSlice.reducer;