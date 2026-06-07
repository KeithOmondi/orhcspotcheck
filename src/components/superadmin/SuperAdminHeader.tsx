// src/components/superadmin/SuperAdminHeader.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Menu, ChevronDown, LogOut, Settings, Shield } from 'lucide-react';
import { logoutUser } from '../../store/slices/authSlice';
import type { AppDispatch, RootState } from '../../store/store';

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

export const SuperAdminHeader: React.FC<AdminHeaderProps> = ({ onMenuToggle }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logoutUser());
    setDropdownOpen(false);
  };

  // Get user's display name - check both possible property names
  const getDisplayName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.full_name) return user.full_name;
    return 'Admin Officer';
  };

  // Get user's initials for avatar
  const getInitials = () => {
    const name = getDisplayName();
    if (name && name !== 'Admin Officer') {
      return name.charAt(0).toUpperCase();
    }
    return 'A';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-stone-200 bg-white px-4 shadow-sm sm:px-6">
      
      {/* Mobile Sidebar Navigation Triggers */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-md p-2 text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-[#1E4620] lg:hidden flex-shrink-0"
          aria-label="Toggle Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        {/* Compact Mobile Title Branding */}
        <div className="flex items-center gap-2 lg:hidden min-w-0">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#1E4620] text-[#C29B38]">
            <Shield className="h-3 w-3" />
          </div>
          <span className="text-sm font-bold text-stone-900 uppercase tracking-wider truncate">
            SpotCheck Portal
          </span>
        </div>
      </div>

      {/* Header Actions Area */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-full p-1.5 transition hover:bg-stone-50 focus:outline-none"
          >
            {/* Branded Profile Initial */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E4620] text-xs font-bold text-[#C29B38] ring-2 ring-stone-100">
              {getInitials()}
            </div>
            <span className="hidden text-xs font-bold uppercase tracking-wider text-stone-700 md:block">
              {getDisplayName()}
            </span>
            <ChevronDown className={`hidden h-4 w-4 text-stone-400 transition-transform duration-150 md:block ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Action Menu Popover */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-md bg-white p-1 shadow-lg ring-1 ring-stone-200 focus:outline-none z-50">
              <div className="px-3 py-2 border-b border-stone-100">
                <p className="text-[10px] font-bold tracking-wider uppercase text-stone-400">Account Profile</p>
                <p className="text-xs font-medium text-stone-600 truncate">{user?.email || 'admin@court.go.ke'}</p>
              </div>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 rounded-md transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings className="h-3.5 w-3.5 text-stone-400" />
                Account Settings
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 text-red-400" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default SuperAdminHeader;