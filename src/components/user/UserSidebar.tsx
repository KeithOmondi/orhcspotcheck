// src/components/user/UserSidebar.tsx
import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ClipboardList, CheckCircle, LayoutDashboard, X } from 'lucide-react';
import type { RootState } from '../../store/store';

interface UserSidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  badge?: number;
  exact?: boolean;
}

const UserSidebar: React.FC<UserSidebarProps> = ({ isMobileOpen, onClose }) => {
  const location = useLocation();
  const { myAssignments } = useSelector((state: RootState) => state.assignment);

  const pendingCount = useMemo(
    () => myAssignments.filter((a) => a.status === 'pending').length,
    [myAssignments]
  );
  const inProgressCount = useMemo(
    () => myAssignments.filter((a) => a.status === 'in_progress').length,
    [myAssignments]
  );
  const submittedCount = useMemo(
    () => myAssignments.filter((a) => a.status === 'submitted').length,
    [myAssignments]
  );

  const activeCount = pendingCount + inProgressCount;

  const navItems: NavItem[] = [
    { label: 'Dashboard',          to: '/user/dashboard',             icon: LayoutDashboard, badge: activeCount,    exact: true },
    { label: 'Active Assignments', to: '/user/assignments',           icon: ClipboardList,   badge: activeCount,    exact: true },
    { label: 'Submitted',          to: '/user/assignments/submitted', icon: CheckCircle,     badge: submittedCount, exact: true },
  ];

  const progressRows = [
    { label: 'Pending',     count: pendingCount,    color: '#f59e0b' },
    { label: 'In Progress', count: inProgressCount, color: '#3b82f6' },
    { label: 'Submitted',   count: submittedCount,  color: '#10b981' },
  ];

  const completionPercentage =
    myAssignments.length > 0
      ? Math.round((submittedCount / myAssignments.length) * 100)
      : 0;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Close button — mobile only */}
      <div className="lg:hidden flex justify-end p-3 border-b border-[#2c5f2e]">
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#2c5f2e]/40 transition-colors"
        >
          <X size={18} color="#a8c5a0" />
        </button>
      </div>

      {/* Nav */}
      <div className="p-3">
        <p className="px-2 mb-2 text-[11px] font-medium uppercase tracking-widest text-[#a8c5a0]">
          Inspections
        </p>
        <nav className="space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, badge, exact }) => {
            const isActive = exact
              ? location.pathname === to
              : location.pathname.startsWith(to);

            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={() =>
                  [
                    'flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-[#2c5f2e] font-medium text-[#f5f0e8]'
                      : 'text-[#a8c5a0] hover:bg-[#2c5f2e]/40 hover:text-[#f5f0e8]',
                  ].join(' ')
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={isActive ? 'text-[#c9a84c]' : 'text-[#a8c5a0]'} />
                  <span>{label}</span>
                </div>
                {badge != null && badge > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold leading-none bg-[#c9a84c] text-[#1a3d1c]">
                    {badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Progress summary */}
      {myAssignments.length > 0 && (
        <div className="m-3 p-3 rounded-md border border-[#2c5f2e] bg-[#1a3d1c]/60">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-medium text-[#a8c5a0]">Overall Progress</p>
            <span className="text-[11px] font-semibold text-[#c9a84c]">{completionPercentage}%</span>
          </div>

          <div className="h-1.5 rounded-full overflow-hidden mb-3 bg-[#0d2410]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%`, background: 'linear-gradient(90deg, #10b981, #059669)' }}
            />
          </div>

          <p className="mb-1.5 text-[11px] font-medium text-[#a8c5a0]">Assignment Status</p>
          {progressRows.map(({ label, count, color }) => (
            <div key={label} className="flex items-center justify-between mb-1 last:mb-0">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-[#a8c5a0]">{label}</span>
              </div>
              <span className="text-xs font-semibold text-[#f5f0e8]">{count}</span>
            </div>
          ))}

          <div className="mt-2 pt-2 border-t border-[#2c5f2e]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-[#a8c5a0] uppercase tracking-wider">Total Assigned</span>
              <span className="text-xs font-semibold text-[#f5f0e8]">{myAssignments.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop — sticky, full height, dark green to match header */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 h-full bg-[#1e4620] border-r border-[#2c5f2e] overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile — slide-in drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${
          isMobileOpen ? 'visible' : 'invisible'
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
            isMobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        <aside
          className={`relative w-72 h-full flex flex-col border-r border-[#2c5f2e] bg-[#1e4620] overflow-y-auto transition-transform duration-300 ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  );
};

export default UserSidebar;