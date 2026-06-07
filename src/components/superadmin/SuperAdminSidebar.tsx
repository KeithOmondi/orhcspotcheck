// src/components/layout/AdminSidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, Cpu, FileText, X } from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuperAdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const links = [
    { to: '/superadmin/dashboard',       label: 'Dashboard',             icon: LayoutDashboard },
    { to: '/superadmin/components',   label: 'Components', icon: ShieldCheck     },
    { to: '/superadmin/assign',   label: 'Assignments', icon: ShieldCheck     },
    { to: '/superadmin/users',  label: 'Users',    icon: Cpu             },
    { to: '/superadmin/logs',             label: 'System Audit Logs',     icon: FileText        },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Main Sidebar Drawer Container - Sticky layout desktop, absolute pullout mobile */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-[#1E4620] text-stone-200 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Core Corporate Branding Title */}
        <div className="flex h-16 items-center justify-between border-b border-emerald-800/60 px-6 gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[#C29B38]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
              Automated Portal
            </span>
          </div>
          
          {/* Mobile Close Button Drawer Trigger */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-emerald-200 hover:bg-[#163317] hover:text-white focus:outline-none lg:hidden"
            aria-label="Close Sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Navigation Links Block */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {links.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition duration-150 group
                  ${isActive 
                    ? 'bg-[#2a5e2c] text-white ring-1 ring-emerald-500/30 shadow-sm' 
                    : 'text-emerald-100/80 hover:bg-[#163317] hover:text-white'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <IconComponent 
                      className={`h-4 w-4 flex-shrink-0 transition-colors duration-150
                        ${isActive ? 'text-[#C29B38]' : 'text-emerald-200/60 group-hover:text-emerald-100'}
                      `} 
                    />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Corporate Footer System Tag */}
        <div className="border-t border-emerald-800/60 p-4 text-center text-[9px] uppercase font-bold tracking-widest text-emerald-300/40 flex-shrink-0">
          ORHC System Suite v2.6
        </div>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;