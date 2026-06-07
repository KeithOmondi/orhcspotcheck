// src/components/user/UserHeader.tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LogOut, ClipboardCheck, Menu } from 'lucide-react';
import { logoutUser } from '../../store/slices/authSlice';
import type { AppDispatch, RootState } from '../../store/store';

interface UserHeaderProps {
  onMenuClick?: () => void;
}

const UserHeader: React.FC<UserHeaderProps> = ({ onMenuClick }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-50 bg-[#1a3d1c] border-b border-[#2c5f2e]">
      <div className="h-14 px-3 sm:px-6 flex items-center gap-3">
        {/* Mobile menu button — only renders below lg */}
        <button
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="lg:hidden w-8 h-8 rounded flex items-center justify-center hover:bg-[#2c5f2e] transition-colors flex-shrink-0"
        >
          <Menu size={18} color="#c9a84c" />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-[#c9a84c]">
            <ClipboardCheck size={14} color="#1a3d1c" />
          </div>
          <div>
            <p className="text-[12px] font-semibold tracking-widest leading-none text-[#c9a84c]">
              SPOTCHECK
            </p>
            <p className="text-[10px] mt-0.5 leading-none text-[#a8c5a0] hidden sm:block">
              Inspections Portal
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User pill */}
          <div className="flex items-center gap-1 sm:gap-2 pl-1 pr-2 sm:pr-3 py-1 rounded-full bg-[#2c5f2e] border border-[#3d7a40]">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 bg-[#c9a84c] text-[#1a3d1c]">
              {initials}
            </div>
            <div className="leading-tight hidden sm:block">
              <p className="text-[12px] font-medium leading-none text-[#f5f0e8]">
                {user?.full_name ?? user?.email ?? 'Inspector'}
              </p>
              {user?.full_name && user?.email && (
                <p className="text-[10px] mt-0.5 leading-none text-[#a8c5a0]">
                  {user.email}
                </p>
              )}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => dispatch(logoutUser())}
            disabled={isLoading}
            title="Sign out"
            className="w-8 h-8 rounded flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[#3d7a40] bg-transparent hover:bg-[#2c5f2e]"
          >
            <LogOut size={15} color="#a8c5a0" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default UserHeader;