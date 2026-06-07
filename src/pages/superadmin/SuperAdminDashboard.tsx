// src/pages/superadmin/SuperAdminDashboard.tsx
import React from 'react';
import { useAppSelector } from '../../store/hooks';

export const SuperAdminDashboard: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userDisplayName = user?.email ? user.email.split('@')[0] : 'Officer';

  // Mock data for key portal performance metrics
  const stats = [
    { name: 'Total Verifications', value: '1,284', change: '+12%', changeType: 'increase', label: 'vs last month' },
    { name: 'Pending Approvals', value: '43', change: '-4%', changeType: 'decrease', label: 'vs yesterday' },
    { name: 'Automation Success Rate', value: '99.2%', change: '+0.4%', changeType: 'increase', label: 'steady bounds' },
    { name: 'Active Sessions', value: '18', change: 'Live', changeType: 'neutral', label: 'current concurrent' },
  ];

  // Mock data for tracking real-time ledger entries
  const recentActivities = [
    { id: 'REC-884', user: 'j.registrar@court.go.ke', action: 'Approved Succession Record', time: '12 mins ago', status: 'Success' },
    { id: 'REC-883', user: 'system_agent_02', action: 'Resolved Duplicate Key Constraint PRF60', time: '45 mins ago', status: 'Resolved' },
    { id: 'REC-882', user: 'a.judge@court.go.ke', action: 'Requested OTP Verification Link', time: '2 hours ago', status: 'Success' },
    { id: 'REC-881', user: 'm.kamau@court.go.ke', action: 'Dispatched Brevo Mail Pipeline', time: '3 hours ago', status: 'Failed' },
  ];

  return (
    <div className="space-y-8 font-sans antialiased bg-stone-50/50 p-1">
      
      {/* 1. Welcome Header Section */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 capitalize">
            Welcome back, {userDisplayName.replace(/[._]/g, ' ')}
          </h1>
          <p className="text-sm text-stone-500">
            ORHC Revised Registry Spot-Checks & Real-Time Automation Dashboard Suite.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-[#1E4620] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#163317] transition-all duration-150 ring-1 ring-emerald-700/30"
          >
            Trigger Automation Run
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Grid Layer */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-stone-200">
            <dt className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {stat.name}
            </dt>
            <dd className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold tracking-tight text-stone-900">
                {stat.value}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                stat.changeType === 'increase' ? 'bg-emerald-50 text-emerald-800' :
                stat.changeType === 'decrease' ? 'bg-amber-50 text-amber-800' : 'bg-stone-100 text-stone-700'
              }`}>
                {stat.change}
              </span>
            </dd>
            <p className="mt-1 text-xs text-stone-400 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* 3. Detailed Data Layout / Activity Table */}
      <div className="rounded-lg bg-white shadow-sm ring-1 ring-stone-200 overflow-hidden">
        <div className="border-b border-stone-100 bg-stone-50/50 px-6 py-5">
          <h3 className="text-base font-bold leading-6 text-stone-900 uppercase tracking-wide text-xs">
            Recent System Activity Ledger
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            Real-time verification tracks, transactional records, and pipeline logging sequences.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs font-bold uppercase tracking-wider text-stone-600">
                <th className="px-6 py-3">Reference ID</th>
                <th className="px-6 py-3">Account Officer</th>
                <th className="px-6 py-3">Execution Trigger</th>
                <th className="px-6 py-3">Time Elapsed</th>
                <th className="px-6 py-3 text-right">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {recentActivities.map((activity) => (
                <tr key={activity.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-xs font-bold text-[#A37F2B]">
                    {activity.id}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-stone-600 font-medium text-xs">
                    {activity.user}
                  </td>
                  <td className="px-6 py-4 text-stone-900 font-medium">
                    {activity.action}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-stone-400 text-xs">
                    {activity.time}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold ${
                      activity.status === 'Success' ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/10' :
                      activity.status === 'Resolved' ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-600/10' : 
                      'bg-red-50 text-red-800 ring-1 ring-red-600/10'
                    }`}>
                      {activity.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Table Pagination Footer */}
        <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/30 px-6 py-4">
          <span className="text-xs font-medium text-stone-500">Showing 1 to 4 of 4 logs</span>
          <button 
            type="button" 
            className="text-xs font-bold uppercase tracking-wider text-[#A37F2B] hover:text-[#1E4620] transition-colors duration-150"
          >
            View All Audit Logs &rarr;
          </button>
        </div>
      </div>

    </div>
  );
};

export default SuperAdminDashboard;