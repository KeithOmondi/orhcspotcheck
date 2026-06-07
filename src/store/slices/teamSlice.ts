// src/store/slices/teamSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface TeamMember {
  user_id:     number;
  email:       string;
  full_name:   string;
  is_team_lead: boolean;
}

export interface Team {
  id:         number;
  name:       string;
  station_id: number | null;
  created_at: string;
  updated_at: string;
  members?:   TeamMember[];
}

interface TeamState {
  teams:         Team[];
  isLoading:     boolean;
  error:         string | null;
  actionSuccess: boolean;
}

const initialState: TeamState = {
  teams:         [],
  isLoading:     false,
  error:         null,
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

// ─── THUNKS ──────────────────────────────────────────────────────────────────

export const fetchTeams = createAsyncThunk<Team[], void>(
  'team/fetchTeams',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get("/spotcheck-admin/teams/get");  // ✅ Correct
      return data.teams as Team[];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createTeam = createAsyncThunk<Team, { name?: string; station_id?: number | null }>(
  'team/createTeam',
  async (teamData, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/spotcheck-admin/teams/create", teamData);  // ✅ Correct
      return data.team as Team;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const addTeamMember = createAsyncThunk<
  { team_id: number; user_id: number; is_team_lead: boolean },
  { team_id: number; user_id: number; is_team_lead: boolean }
>(
  'team/addTeamMember',
  async (payload, { rejectWithValue }) => {
    try {
      await axiosClient.post("/spotcheck-admin/teams/members/add", payload);  // ✅ Fixed
      return payload;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const removeTeamMember = createAsyncThunk<
  { team_id: number; user_id: number },
  { team_id: number; user_id: number }
>(
  'team/removeTeamMember',
  async ({ team_id, user_id }, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/spotcheck-admin/teams/remove/${team_id}/members/${user_id}`);  // ✅ Fixed
      return { team_id, user_id };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ─── SLICE ────────────────────────────────────────────────────────────────────

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    clearTeamError: (state) => {
      state.error = null;
    },
    resetTeamSuccess: (state) => {
      state.actionSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder

      // ── Fetch Teams ──────────────────────────────────────────────────────────
      .addCase(fetchTeams.pending, (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.isLoading = false;
        state.teams     = action.payload;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      })

      // ── Create Team ──────────────────────────────────────────────────────────
      .addCase(createTeam.pending, (state) => {
        state.isLoading     = true;
        state.error         = null;
        state.actionSuccess = false;
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.isLoading     = false;
        state.actionSuccess = true;
        state.teams.push({ ...action.payload, members: [] });
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      })

      // ── Add Team Member ──────────────────────────────────────────────────────
      .addCase(addTeamMember.pending, (state) => {
        state.isLoading     = true;
        state.error         = null;
        state.actionSuccess = false;
      })
      .addCase(addTeamMember.fulfilled, (state, action) => {
        state.isLoading     = false;
        state.actionSuccess = true;
        // Optimistic update — full name/email filled in on next fetchTeams
        const { team_id, user_id, is_team_lead } = action.payload;
        const team = state.teams.find(t => t.id === team_id);
        if (team) {
          if (!team.members) team.members = [];
          const existing = team.members.find(m => m.user_id === user_id);
          if (!existing) {
            team.members.push({ user_id, email: '', full_name: '', is_team_lead });
          } else {
            if (is_team_lead) team.members.forEach(m => (m.is_team_lead = false));
            existing.is_team_lead = is_team_lead;
          }
        }
      })
      .addCase(addTeamMember.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      })

      // ── Remove Team Member ───────────────────────────────────────────────────
      .addCase(removeTeamMember.pending, (state) => {
        state.isLoading     = true;
        state.error         = null;
        state.actionSuccess = false;
      })
      .addCase(removeTeamMember.fulfilled, (state, action) => {
        state.isLoading     = false;
        state.actionSuccess = true;
        const { team_id, user_id } = action.payload;
        const team = state.teams.find(t => t.id === team_id);
        if (team?.members) {
          team.members = team.members.filter(m => m.user_id !== user_id);
        }
      })
      .addCase(removeTeamMember.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      });
  },
});

export const { clearTeamError, resetTeamSuccess } = teamSlice.actions;
export default teamSlice.reducer;