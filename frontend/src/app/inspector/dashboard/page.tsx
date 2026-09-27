"use client";

import React, { useState } from 'react';
import { useAppStore } from '../../../context/store';
import { ShieldAlert, AlertTriangle, CheckCircle, BarChart3, Map as MapIcon, Inbox } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { motion } from 'framer-motion';

const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/countries/india/india-districts.json"; // Public topojson for India

export default function InspectorDashboard() {
  const { scans, notices, isInitialized } = useAppStore();
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

  // Dynamic hotspot calculation based on real scans
  const districtCounts: Record<string, number> = {};
  scans.filter(s => s.status !== 'COMPLIANT' && s.location?.district).forEach(s => {
    districtCounts[s.location!.district] = (districtCounts[s.location!.district] || 0) + 1;
  });
  const topDistrict = Object.entries(districtCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Enforcement Dashboard</h1>
          <p className="text-gray-500 font-mono text-sm">Zone: MH-04 • Inspector ID: INS-7729</p>
        </div>
        <Link href="/inspector/queue" className="bg-gray-900 dark:bg-indigo-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-black dark:hover:bg-indigo-500 transition-colors flex items-center gap-2 shadow-sm">
          <Inbox className="w-4 h-4" /> Go to Queue ({pendingNotices.length + userFlags.length})
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {!isInitialized ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-32 flex flex-col justify-between animate-pulse">
              <div className="w-24 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
              <div>
                <div className="w-16 h-8 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
                <div className="w-32 h-3 bg-gray-200 dark:bg-gray-800 rounded"></div>
              </div>
            </div>
          ))
        ) : (
          [
            { title: "Total Audited", value: totalAudited.toString(), subtext: "All scans" },
            { title: "Critical Violations", value: criticalViolations.toString(), subtext: `${totalAudited > 0 ? Math.round((criticalViolations/totalAudited)*100) : 0}% of total`, alert: criticalViolations > 0 },
            { title: "Notices Issued", value: noticesIssued.toString(), subtext: `${resolvedNotices} resolved` },
            { title: "Compliance Rate", value: totalAudited > 0 ? `${Math.round(((totalAudited - criticalViolations) / totalAudited) * 100)}%` : 'N/A', subtext: "Based on scans" }
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.5 }}>
              <KPICard {...kpi} />
            </motion.div>
          ))
        )}
      </div>

      {/* Dense Data Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Charts / Map */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[500px] overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              {activeTab === 'metrics' ? <BarChart3 className="w-5 h-5 text-indigo-500" /> : <MapIcon className="w-5 h-5 text-indigo-500" />}
              {activeTab === 'metrics' ? 'Violation Analytics' : 'District Heatmap'}
            </h2>
            <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-md">
              <button onClick={() => setActiveTab('metrics')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${activeTab === 'metrics' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>METRICS</button>
              <button onClick={() => setActiveTab('map')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${activeTab === 'map' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>MAP</button>
            </div>
          </div>
          
          <div className="flex-1 p-6 relative">
            {!isInitialized ? (
              <div className="w-full h-full flex items-end justify-around gap-4 opacity-50 animate-pulse px-8">
                <div className="w-full h-[80%] bg-gray-100 dark:bg-gray-800 rounded-t-lg"></div>
                <div className="w-full h-[40%] bg-gray-100 dark:bg-gray-800 rounded-t-lg"></div>
                <div className="w-full h-[60%] bg-gray-100 dark:bg-gray-800 rounded-t-lg"></div>
                <div className="w-full h-[90%] bg-gray-100 dark:bg-gray-800 rounded-t-lg"></div>
              </div>
            ) : activeTab === 'metrics' ? (
              violationTypes.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <BarChart3 className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No violation data yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Violations from scans will appear here.</p>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={violationTypes} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="colorCountCrit" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" className="dark:opacity-10" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} width={120} />
                  <Tooltip 
                    cursor={{fill: 'rgba(107, 114, 128, 0.05)'}} 
                    contentStyle={{borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', backgroundColor: 'rgba(17, 24, 39, 0.85)', backdropFilter: 'blur(12px)', color: '#fff'}} 
                    itemStyle={{fontWeight: 'bold', color: '#fff'}}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {violationTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? 'url(#colorCountCrit)' : 'url(#colorCount)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              )
            ) : (
              <div className="w-full h-full bg-[#f8fafc] dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/India_blank_map.svg/1000px-India_blank_map.svg.png')] bg-contain bg-no-repeat bg-center mix-blend-multiply" />
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none">
                   {topDistrict ? (
                     <>
                       <div className="bg-red-500/20 w-32 h-32 rounded-full absolute top-[30%] left-[20%] animate-pulse border border-red-500 flex items-center justify-center">
                         <div className="w-2 h-2 bg-red-600 rounded-full" />
                       </div>
                       <div className="bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-gray-200 pointer-events-auto absolute top-4 left-4">
                         <p className="text-xs font-bold text-gray-500 uppercase">Hotspot Alert</p>
                         <p className="text-sm font-bold text-gray-900">{topDistrict[0]}: {topDistrict[1]} violations</p>
                       </div>
                     </>
                   ) : (
                     <div className="bg-white/90 backdrop-blur p-4 rounded-lg shadow-sm border border-gray-200 text-center pointer-events-auto">
                       <MapIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                       <p className="text-sm font-bold text-gray-900">No Hotspots Detected</p>
                       <p className="text-xs text-gray-500">Awaiting user scans with geolocation.</p>
                     </div>
                   )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Urgent Queue Preview */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[500px] overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-between items-center">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">Urgent Triage</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Awaiting Verification</div>
            {!isInitialized ? (
              [1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>)
            ) : pendingNotices.slice(0,3).map(n => (
               <Link href={`/inspector/queue`} key={n.id} className="block bg-blue-50 dark:bg-indigo-900/20 border border-blue-100 dark:border-indigo-800/30 p-3 rounded-lg hover:bg-blue-100 dark:hover:bg-indigo-900/40 transition-colors">
                 <div className="flex justify-between items-start mb-1">
                   <span className="text-sm font-bold text-blue-900 dark:text-indigo-300">{n.manufacturer}</span>
                   <span className="text-[10px] font-bold bg-blue-200 dark:bg-indigo-800 text-blue-800 dark:text-indigo-200 px-1.5 py-0.5 rounded">RE-VERIFY</span>
                 </div>
                 <p className="text-xs text-blue-800 dark:text-indigo-400 line-clamp-1">{n.productName}</p>
               </Link>
            ))}

            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 mt-6">Flagged by Users</div>
            {!isInitialized ? (
              [1,2].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>)
            ) : userFlags.slice(0,4).map(s => (
               <Link href={`/results/${s.id}`} key={s.id} className="block bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative">
                 <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-gray-900 shadow-sm" />
                 <div className="flex justify-between items-start mb-1">
                   <span className="text-sm font-bold text-gray-900 dark:text-gray-100 pr-2">{s.productName}</span>
                   <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 px-1.5 py-0.5 rounded">FLAGGED</span>
                 </div>
                 <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">Score: {s.score}/100</p>
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
    <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between h-32 transition-colors ${alert ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
      <span className={`text-sm font-semibold tracking-tight ${alert ? 'text-red-800 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{title}</span>
      <div>
        <div className={`text-3xl font-bold ${alert ? 'text-red-900 dark:text-red-100' : 'text-gray-900 dark:text-white'}`}>{value}</div>
        <div className={`text-xs font-medium mt-1 ${alert ? 'text-red-600 dark:text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>{subtext}</div>
      </div>
    </div>
  );
}
