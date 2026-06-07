// src/routes/AppRoutes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoutes from '../Route/ProtectedRoutes';
import { useAppSelector } from '../store/hooks';


// Import Page Level Components
import { SuperAdminDashboard } from '../pages/superadmin/SuperAdminDashboard';
import LoginPage from '../pages/auth/LoginPage';
import SuperAdminUsers from '../pages/superadmin/SuperAdminUsers';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminComponents from '../pages/admin/AdminComponents';
import SuperAdminLayout from '../components/superadmin/SuperAdminLayout';
import AdminLayout from '../components/admin/AdminLayout';
import UserLayout from '../components/user/UserLayout';
import UserAssignments from '../pages/user/UserAssignments';
import UserSubmitted from '../pages/user/UserSubmitted';
import UserSubmittedAssignments from '../pages/user/UserSubmittedAssignments';
import UserDashboard from '../pages/user/UserDashboard';
import AdminTeams from '../pages/admin/AdminTeams';
import AdminUsers from '../pages/admin/AdminUsers';
import SuperAdminComponents from '../pages/superadmin/SuperAdminComponents';
import SuperAdminAssign from '../pages/superadmin/SuperAdminAssign';
import AdminSubmissions from '../pages/admin/AdminSubmission';

// ─── BRANDED PLUGINS / INLINE VIEWS FOR COMPILING COHESION ────────────────

const UnauthorizedView = () => (
  <div className="flex min-h-screen items-center justify-center bg-stone-50 text-center px-4">
    <div className="max-w-md rounded-lg bg-white p-8 shadow-md ring-1 ring-stone-200">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold tracking-tight text-stone-900 uppercase">403 - Access Denied</h1>
      <p className="text-stone-500 mt-2 text-sm leading-relaxed">
        Your security profile credentials do not possess the authorization permissions required to inspect this secure workspace.
      </p>
      <a href="/" className="mt-5 inline-block text-xs font-bold tracking-wider uppercase text-[#A37F2B] hover:text-[#1E4620] transition-colors">
        &larr; Return to Workspace Hub
      </a>
    </div>
  </div>
);



// Smart redirect script intercepting root paths and unhandled links
const DynamicRootRedirect = () => {
  const { accessToken, user } = useAppSelector((state) => state.auth);

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  // Route them clean into their active role-specific control grids
  switch (user.role) {
    case 'super_admin':
      return <Navigate to="/superadmin/dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'user':
    default:
      return <Navigate to="/user/dashboard" replace />;
  }
};

// ─── COMPREHENSIVE MAIN APP ROUTES TREE CONFIGURATION ──────────────────────
export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      
      {/* 1. Public Authentication Entry Points */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedView />} />
      
      {/* Index handler sorting logged state direction */}
      <Route path="/" element={<DynamicRootRedirect />} />

      {/* =========================================================================
          BRANCH A: SUPER ADMIN ISOLATED ZONE
          ========================================================================= */}
      <Route element={<ProtectedRoutes allowedRoles={['super_admin']} />}>
        <Route element={<SuperAdminLayout />}>
          <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/superadmin/components" element={<SuperAdminComponents />} />
          <Route path="/superadmin/assign" element={<SuperAdminAssign />} />
          <Route path="/superadmin/users" element={<SuperAdminUsers />} />
        </Route>
      </Route>

      {/* =========================================================================
          BRANCH B: REGULAR ADMIN ZONE (Available for activation on layout completion)
          ========================================================================= */}
      <Route element={<ProtectedRoutes allowedRoles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/components" element={<AdminComponents />} />
          <Route path="/admin/submissions" element={<AdminSubmissions />} />
          <Route path="/admin/teams" element={<AdminTeams />} />
          <Route path="/admin/users" element={<AdminUsers />} />
        </Route>
      </Route>  

      {/* =========================================================================
          BRANCH C: BASE OPERATIONAL USER ZONE (Available for activation on layout completion)
          =========================================================================  */}
      <Route element={<ProtectedRoutes allowedRoles={['user']} />}>
        <Route element={<UserLayout />}>
        <Route path="/user/dashboard" element={<UserDashboard />} />
          <Route path="/user/assignments" element={<UserAssignments />} />
  <Route path="/user/assignments/:id" element={<UserSubmitted />} />
  <Route path="/user/assignments/submitted" element={<UserSubmittedAssignments />} />
        </Route>
      </Route> 

      {/* 4. Catch-All Global Redirection Interceptor */}
      <Route path="*" element={<DynamicRootRedirect />} />

    </Routes>
  );
};

export default AppRoutes;