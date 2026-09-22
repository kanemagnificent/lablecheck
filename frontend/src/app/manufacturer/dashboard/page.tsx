"use client";

import React from 'react';
import { useAppStore } from '../../../context/store';
import { AlertCircle, Clock, FileCheck, Target, ArrowUpRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function ManufacturerDashboard() {
  const { notices, scans } = useAppStore();

  const activeNotices = notices.filter(n => n.status === 'ISSUED' || n.status === 'UNDER_CORRECTION');
  
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Manufacturer Dashboard</h1>
          <p className="text-gray-500">Welcome back, Acme Corp.</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Active Notices" value={activeNotices.length.toString()} icon={<AlertCircle className="w-5 h-5 text-red-500" />} trend="+2 this month" trendUp={false} />
        <KPICard title="Products Audited" value={scans.length.toString()} icon={<FileCheck className="w-5 h-5 text-blue-500" />} />
        <KPICard title="Compliance Rate" value="92%" icon={<Target className="w-5 h-5 text-green-500" />} trend="+4% vs last Q" trendUp={true} />
        <KPICard title="Nearest Deadline" value="3 Days" icon={<Clock className="w-5 h-5 text-amber-500" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Action Required (Left 2/3) */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-900">Action Required</h2>
            <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">{activeNotices.length} Pending</span>
          </div>
          <div className="divide-y divide-gray-100">
            {activeNotices.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No active notices. You are fully compliant!</div>
            ) : (
              activeNotices.map(notice => (
                <div key={notice.id} className="p-5 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900">{notice.productName}</span>
                      <span className="font-mono text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded">{notice.violations.length} Violations</span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono">Issued: {notice.issuedAt} • Deadline: {notice.deadline}</p>
                  </div>
                  <Link 
                    href={`/manufacturer/notices/${notice.id}`}
                    className="shrink-0 bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-1 shadow-sm"
                  >
                    View Details <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Feed (Right 1/3) */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-5 flex-1 relative">
            <div className="absolute left-6 top-5 bottom-5 w-px bg-gray-200" />
            <div className="space-y-6 relative">
              <ActivityItem text="Corrective action submitted for 'Acme Chips'" time="2 hours ago" status="pending" />
              <ActivityItem text="Inspector resolved notice #LM-892" time="1 day ago" status="resolved" />
              <ActivityItem text="New notice issued for 'Acme Soap'" time="3 days ago" status="danger" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, trend, trendUp }: { title: string, value: string, icon: React.ReactNode, trend?: string, trendUp?: boolean }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <span className="text-sm font-semibold text-gray-500 tracking-tight">{title}</span>
        {icon}
      </div>
      <div>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {trend && (
          <div className={`text-xs font-medium mt-1 flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-3 h-3 ${!trendUp && 'rotate-180'}`} /> {trend}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ text, time, status }: { text: string, time: string, status: 'resolved' | 'pending' | 'danger' }) {
  return (
    <div className="flex gap-4 items-start">
      <div className={`shrink-0 w-3 h-3 rounded-full mt-1.5 ring-4 ring-white relative z-10 ${
        status === 'resolved' ? 'bg-green-500' : status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
      }`} />
      <div>
        <p className="text-sm font-medium text-gray-900 leading-snug">{text}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-mono">{time}</p>
      </div>
    </div>
  );
}
