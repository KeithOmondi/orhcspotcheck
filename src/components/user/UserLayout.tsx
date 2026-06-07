// src/components/user/UserLayout.tsx
import React, { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyAssignments, clearAssignmentError } from '../../store/slices/assignmentSlice';
import type { AppDispatch, RootState } from '../../store/store';
import UserHeader from './UserHeader';
import UserSidebar from './UserSidebar';

const UserLayout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { error } = useSelector((state: RootState) => state.assignment);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    dispatch(fetchMyAssignments());
    return () => { dispatch(clearAssignmentError()); };
  }, [dispatch, user]);

  // Close sidebar when viewport widens past lg breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isMobileSidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileSidebarOpen]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex flex-col h-screen bg-[var(--color-background-tertiary)]">
      <UserHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />

      {/* ← sidebar is INSIDE this row so it sits beside main */}
      <div className="flex flex-1 overflow-hidden">
        <UserSidebar
          isMobileOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {error && (
            <div className="flex items-center justify-between p-2.5 mb-4 rounded bg-[var(--color-background-danger)] border border-[var(--color-border-danger)]">
              <span className="text-sm text-[var(--color-text-danger)]">{error}</span>
              <button
                onClick={() => dispatch(clearAssignmentError())}
                className="bg-none border-none cursor-pointer p-0 pl-3 leading-none"
              >
                <i className="ti ti-x text-sm text-[var(--color-text-danger)]" aria-label="Dismiss error" />
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default UserLayout;