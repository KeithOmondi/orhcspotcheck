// AdminHeader.tsx
import { useLocation } from 'react-router-dom';
import { LogOut, User, Menu } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logoutUser } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store/store';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

const AdminHeader = ({ onMenuClick }: AdminHeaderProps) => {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/admin/users')) return 'Users';
    if (path.includes('/admin/teams')) return 'Teams';
    if (path.includes('/admin/assignments')) return 'Assignments';
    if (path.includes('/admin/components')) return 'Components';
    if (path.includes('/admin/submissions')) return 'Submissions';
    return 'Dashboard';
  };

  const getPageDescription = () => {
    const path = location.pathname;
    if (path.includes('/admin/users')) return 'Manage system users and their roles';
    if (path.includes('/admin/teams')) return 'Organize users into teams';
    if (path.includes('/admin/assignments')) return 'Assign inspection tasks to users';
    if (path.includes('/admin/components')) return 'Manage inspection components';
    if (path.includes('/admin/submissions')) return 'Review submitted inspections';
    return 'Overview of system activity';
  };

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  return (
    <header
      className="sticky top-0 z-40 shadow-sm"
      style={{ background: '#1a3d1c', borderBottom: '1px solid #2c5f2e' }}
    >
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 -ml-2 rounded-lg transition-colors hover:bg-white/10"
              aria-label="Toggle menu"
              style={{ color: '#c9a84c' }}
            >
              <Menu size={20} />
            </button>
            
            <div>
              <h1 className="text-lg sm:text-xl font-semibold font-serif" style={{ color: '#fdf8f0' }}>
                {getPageTitle()}
              </h1>
              <p className="text-xs mt-0.5 hidden sm:block font-serif" style={{ color: '#a8c5a0' }}>
                {getPageDescription()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                style={{ background: '#c9a84c' }}
              >
                <User className="w-4 h-4" style={{ color: '#1a3d1c' }} />
              </div>
              <div className="hidden md:block">
                <span className="text-sm font-medium" style={{ color: '#fdf8f0' }}>Admin</span>
                <p className="text-xs" style={{ color: '#a8c5a0' }}>Administrator</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200"
              style={{ color: '#ff9999' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#ffcccc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#ff9999';
              }}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;