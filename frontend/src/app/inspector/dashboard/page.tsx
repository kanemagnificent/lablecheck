"use client";

import React, { useState } from 'react';
import { useAppStore } from '../../../context/store';
import { ShieldAlert, AlertTriangle, CheckCircle, BarChart3, Map as MapIcon, Inbox } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/countries/india/india-districts.json"; // Public topojson for India

export default function InspectorDashboard() {
  const { scans, notices } = useAppStore();
  const [activeTab, setActiveTab] = useState<'metrics' | 'map'>('metrics');

  const pendingNotices = notices.filter(n => n.status === 'SUBMITTED');
  const userFlags = scans.filter(s => s.status !== 'COMPLIANT');

  // Real computed stats from actual scan data
  const totalAudited = scans.length;
  const criticalViolations = scans.filter(s => s.status === 'NON_COMPLIANT').length;
  const noticesIssued = notices.length;
  const resolvedNotices = notices.filter(n => n.status === 'RESOLVED').length;

  // Real violation type breakdown from actual scan data
  const violationCounts: Record<string, number> = {};
  scans.forEach(s => {
    s.violations?.forEach((v) => {
      const label = v.field || v.ruleCitation || 'Other';
      violationCounts[label] = (violationCounts[label] || 0) + 1;
    });
  });
  const violationTypes = Object.entries(violationCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Enforcement Dashboard</h1>
          <p className="text-gray-500 font-mono text-sm">Zone: MH-04 • Inspector ID: INS-7729</p>
        </div>
        <Link href="/inspector/queue" className="bg-gray-900 text-white font-medium px-4 py-2 rounded-lg hover:bg-black transition-colors flex items-center gap-2 shadow-sm">
          <Inbox className="w-4 h-4" /> Go to Queue ({pendingNotices.length + userFlags.length})
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Audited" value={totalAudited.toString()} subtext="All scans" />
        <KPICard title="Critical Violations" value={criticalViolations.toString()} subtext={`${totalAudited > 0 ? Math.round((criticalViolations/totalAudited)*100) : 0}% of total`} alert={criticalViolations > 0} />
        <KPICard title="Notices Issued" value={noticesIssued.toString()} subtext={`${resolvedNotices} resolved`} />
        <KPICard title="Compliance Rate" value={totalAudited > 0 ? `${Math.round(((totalAudited - criticalViolations) / totalAudited) * 100)}%` : 'N/A'} subtext="Based on scans" />
      </div>

      {/* Dense Data Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Charts / Map */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              {activeTab === 'metrics' ? <BarChart3 className="w-5 h-5" /> : <MapIcon className="w-5 h-5" />}
              {activeTab === 'metrics' ? 'Violation Analytics' : 'District Heatmap'}
            </h2>
            <div className="flex bg-gray-200 p-1 rounded-md">
              <button onClick={() => setActiveTab('metrics')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${activeTab === 'metrics' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>METRICS</button>
              <button onClick={() => setActiveTab('map')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${activeTab === 'map' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>MAP</button>
            </div>
          </div>
          
          <div className="flex-1 p-6 relative">
            {activeTab === 'metrics' ? (
              violationTypes.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <BarChart3 className="w-12 h-12 text-gray-200 mb-3" />
                  <p className="text-gray-500 font-medium">No violation data yet</p>
                  <p className="text-sm text-gray-400">Violations from scans will appear here.</p>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={violationTypes} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#111827', fontWeight: 600 }} width={120} />
                  <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {violationTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#111827'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              )
            ) : (
              <div className="w-full h-full bg-[#f8fafc] rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden relative">
                {/* Fallback mock map rendering since loading topojson dynamically can be tricky in mock env */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/India_blank_map.svg/1000px-India_blank_map.svg.png')] bg-contain bg-no-repeat bg-center mix-blend-multiply" />
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none">
                   <div className="bg-red-500/20 w-32 h-32 rounded-full absolute top-[30%] left-[20%] animate-pulse border border-red-500" />
                   <div className="bg-amber-500/20 w-24 h-24 rounded-full absolute bottom-[40%] right-[30%] border border-amber-500" />
                   <div className="bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-gray-200 pointer-events-auto absolute top-4 left-4">
                     <p className="text-xs font-bold text-gray-500 uppercase">Hotspot Alert</p>
                     <p className="text-sm font-bold text-gray-900">Pune District: High violation rate</p>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Urgent Queue Preview */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">Urgent Triage</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Awaiting Verification</div>
            {pendingNotices.slice(0,3).map(n => (
               <Link href={`/inspector/queue`} key={n.id} className="block bg-blue-50 border border-blue-100 p-3 rounded-lg hover:bg-blue-100 transition-colors">
                 <div className="flex justify-between items-start mb-1">
                   <span className="text-sm font-bold text-blue-900">{n.manufacturer}</span>
                   <span className="text-[10px] font-bold bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded">RE-VERIFY</span>
                 </div>
                 <p className="text-xs text-blue-800 line-clamp-1">{n.productName}</p>
               </Link>
            ))}

            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6">Flagged by Users</div>
            {userFlags.slice(0,4).map(s => (
               <Link href={`/results/${s.id}`} key={s.id} className="block bg-gray-50 border border-gray-200 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                 <div className="flex justify-between items-start mb-1">
                   <span className="text-sm font-bold text-gray-900">{s.productName}</span>
                   <span className="text-[10px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded">FLAGGED</span>
                 </div>
                 <p className="text-xs text-gray-500 font-mono">Score: {s.score}/100</p>
               </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function KPICard({ title, value, subtext, alert }: { title: string, value: string, subtext: string, alert?: boolean }) {
  return (
    <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between h-32 ${alert ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
      <span className={`text-sm font-semibold tracking-tight ${alert ? 'text-red-800' : 'text-gray-500'}`}>{title}</span>
      <div>
        <div className={`text-3xl font-bold ${alert ? 'text-red-900' : 'text-gray-900'}`}>{value}</div>
        <div className={`text-xs font-medium mt-1 ${alert ? 'text-red-600' : 'text-gray-400'}`}>{subtext}</div>
      </div>
    </div>
  );
}
