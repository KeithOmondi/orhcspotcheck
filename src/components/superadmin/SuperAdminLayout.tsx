// src/components/layout/AdminLayout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SuperAdminSidebar from './SuperAdminSidebar';
import SuperAdminHeader from './SuperAdminHeader';

export const SuperAdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-stone-50 font-sans antialiased overflow-hidden">
      
      {/* 1. Left-docked Navigation Sidebar (Sticky desktop, absolute overlay mobile) */}
      <SuperAdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 2. Main Area Frame */}
      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden">
        
        {/* Top Control Boundary Line (Sticky) */}
        <SuperAdminHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Dynamic Viewport Scroller Block */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;