// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { injectStore } from '../api/api'; // Ensure this relative path accurately points to your axios client file
import superAdminReducer from "./slices/superAdminSlice"
import userReducer from "./slices/userSlice"
import componentReducer from "./slices/componentSlice"
import teamReducer from "./slices/teamSlice"
import assignmentReducer from "./slices/assignmentSlice"
import userAssignmentReducer from './slices/userAssignmentSlice';
import submissionReducer from './slices/submissionSlice';
import stationReducer from "./slices/stationSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    superAdmin: superAdminReducer,
    user: userReducer,
    component: componentReducer,
    team: teamReducer,
    assignment: assignmentReducer,
    userAssignment: userAssignmentReducer,
    submission: submissionReducer,
    station: stationReducer
  },
});

// Dynamically inject our store instance into the Axios interceptor array cleanly at runtime
injectStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;