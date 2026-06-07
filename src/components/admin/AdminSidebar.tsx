// AdminSidebar.tsx
import { NavLink, useLocation } from 'react-router-dom';
import { Users, Users2, LayoutDashboard, X } from 'lucide-react';

interface AdminSidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

const AdminSidebar = ({ isMobileOpen, onClose }: AdminSidebarProps) => {
  const location = useLocation();

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/components', label: 'Components', icon: LayoutDashboard },
    { to: '/admin/submissions', label: 'Submissions', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/teams', label: 'Teams', icon: Users2 },
  ];

  const sidebarContent = (
    <>
      <div className="p-4 sm:p-6 border-b" style={{ borderColor: '#2c5f2e' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold" style={{ color: '#c9a84c' }}>
              SpotCheck Admin
            </h2>
            <p className="text-xs mt-0.5 sm:mt-1" style={{ color: '#a8c5a0' }}>
              Manage teams & assignments
            </p>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 -mr-2 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: '#a8c5a0' }}
          >
            <X size={20} />
          </button>
        </div>
      </div>
      <nav className="p-3 sm:p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/admin/dashboard' && location.pathname.startsWith(item.to));
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-[#c9a84c] text-[#1a3d1c] shadow-sm'
                  : 'text-[#fdf8f0] hover:bg-white/10'
                }
              `}
            >
              <item.icon className={`w-4 h-4 ${isActive ? 'text-[#1a3d1c]' : 'text-[#c9a84c]'}`} />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1 h-6 bg-[#1a3d1c] rounded-full" />
              )}
            </NavLink>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar - always visible, sticky */}
      <aside
        className="hidden lg:flex lg:w-64 flex-shrink-0 flex-col sticky top-0 h-screen"
        style={{ background: '#1a3d1c', borderRight: '1px solid #2c5f2e' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar - overlay */}
      <div
        className={`
          lg:hidden fixed inset-0 z-50 transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Sidebar panel */}
        <aside
          className="relative w-72 h-full shadow-xl flex flex-col overflow-y-auto"
          style={{ background: '#1a3d1c', borderRight: '1px solid #2c5f2e' }}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  );
};

export default AdminSidebar;