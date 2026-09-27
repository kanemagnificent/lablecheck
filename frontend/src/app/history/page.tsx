"use client";

import { useAppStore } from '../../context/store';
import Link from 'next/link';
import { Search, History as HistoryIcon, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ScanResult, Status, adaptBackendScan } from '../../mock/data';
import { fetchLogs } from '../../lib/api';
import { motion } from 'framer-motion';

export default function HistoryPage() {
  const { scans, setScans, role } = useAppStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs().then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setScans(data.map(adaptBackendScan));
      }
    }).catch(() => {
      // Silence error logs
    })
    .finally(() => setLoading(false));
  }, [setScans]);

  // All roles see all real scans from the backend
  const filteredScans = scans.filter((scan) => {
    const matchesSearch = scan.productName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || scan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-4xl mx-auto min-h-[80vh]">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Scan History</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {role === 'USER' ? 'Your personal scan history.' : 'All system scans.'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 outline-none w-full sm:w-64 text-sm transition-colors"
            />
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-full sm:w-auto overflow-x-auto no-scrollbar">
            {['ALL', 'COMPLIANT', 'WARNING', 'NON_COMPLIANT'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as Status | 'ALL')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === status 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
              >
                {status === 'ALL' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[250px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-4 animate-pulse">
              <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg w-full"></div>
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3"></div>
              <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded w-3/4"></div>
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2 mt-auto"></div>
            </div>
          ))}
        </div>
      ) : filteredScans.length === 0 ? (
        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-2xl p-16 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-24 h-24 mb-6 relative">
            <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full animate-ping opacity-75"></div>
            <div className="relative w-full h-full bg-white dark:bg-gray-800 rounded-full shadow-md flex items-center justify-center border-4 border-blue-50 dark:border-blue-900/50">
              <CheckCircle className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {scans.length === 0 ? "You're All Set!" : "No Matches Found"}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
            {scans.length === 0
              ? "Your queue is completely clear. Scan a new product to get started and see real-time compliance results."
              : "We couldn't find any scans matching your current filters. Try adjusting your search query."}
          </p>
          {scans.length === 0 && (
            <Link href="/scan" className="bg-gray-900 dark:bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-black dark:hover:bg-indigo-500 transition-all shadow-lg shadow-gray-900/20 active:scale-95">
              Scan First Product
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScans.map((scan, i) => (
            <motion.div 
              key={scan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link 
                href={`/results/${scan.id}`}
                className="group flex flex-col h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]"
              >
                <div className="h-32 bg-gray-50 dark:bg-gray-950 relative p-4 flex items-center justify-center border-b border-gray-100 dark:border-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={scan.imageFront} alt={scan.productName} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-sm" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <StatusBadge status={scan.status} />
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-gray-500 mb-1">{new Date(scan.timestamp).toLocaleDateString()}</span>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-1 mb-1">{scan.productName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{scan.manufacturer}</p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${scan.score >= 80 ? 'bg-green-500' : scan.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <span className="font-mono font-bold text-sm text-gray-700 dark:text-gray-300">{scan.score}/100</span>
                    </div>
                    <span className="text-xs font-bold text-blue-600 dark:text-indigo-400 group-hover:underline">View Report &rarr;</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === 'COMPLIANT') {
    return <span className="bg-[#22c55e] text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm flex items-center gap-1"><CheckCircle className="w-3 h-3"/> COMPLIANT</span>
  }
  if (status === 'NON_COMPLIANT') {
    return <span className="bg-[#ef4444] text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm flex items-center gap-1"><AlertCircle className="w-3 h-3"/> NON-COMPLIANT</span>
  }
  return <span className="bg-[#f59e0b] text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> WARNING</span>
}
