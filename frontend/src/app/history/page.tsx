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

  // Users only see their own scans (mocked as the first 2 scans for demo purposes)
  const accessibleScans = role === 'USER' ? scans.slice(0, 2) : scans;

  const filteredScans = accessibleScans.filter((scan) => {
    const matchesSearch = scan.productName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || scan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-4xl mx-auto min-h-[80vh]">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scan History</h1>
          <p className="text-gray-600">
            {role === 'USER' ? 'Your personal scan history.' : 'All system scans.'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-black outline-none w-full sm:w-64 text-sm"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Status | 'ALL')}
            className="border border-gray-300 rounded-md bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLIANT">Compliant</option>
            <option value="WARNING">Warnings</option>
            <option value="NON_COMPLIANT">Non-Compliant</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
        </div>
      ) : filteredScans.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center flex flex-col items-center">
          <HistoryIcon className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No scans found</h3>
          <p className="text-gray-500 mb-6 max-w-md">
            {accessibleScans.length === 0 
              ? "You haven't scanned any products yet. Scan your first product to see it here."
              : "No scans match your current filters. Try adjusting your search."}
          </p>
          {accessibleScans.length === 0 && (
            <Link href="/scan" className="bg-gray-900 text-white px-6 py-2.5 rounded-md font-medium hover:bg-gray-800 transition-colors">
              Scan a product
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
                className="group flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all hover:border-gray-300"
              >
                <div className="h-32 bg-gray-100 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={scan.imageFront} alt={scan.productName} className="w-full h-full object-cover mix-blend-multiply opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <StatusBadge status={scan.status} />
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <span className="font-mono text-xs text-gray-500 mb-1">{new Date(scan.timestamp).toLocaleDateString()}</span>
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{scan.productName}</h3>
                  <p className="text-sm text-gray-500 mb-4">{scan.manufacturer}</p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <span className="font-mono font-medium text-sm text-gray-700">Score: {scan.score}/100</span>
                    <span className="text-sm font-medium text-blue-600 group-hover:underline">View Report &rarr;</span>
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
