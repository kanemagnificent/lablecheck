"use client";

import React from 'react';
import { useAppStore } from '../../../context/store';
import { Inbox, Flag, RefreshCw, AlertTriangle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import EmptyState from '../../../components/EmptyState';

export default function InspectorQueue() {
  const { scans, notices } = useAppStore();

  const flaggedScans = scans.filter(s => s.status !== 'COMPLIANT');
  const resubmittedNotices = notices.filter(n => n.status === 'SUBMITTED');

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1 flex items-center gap-3">
          <Inbox className="w-8 h-8 text-gray-900" /> Action Queue
        </h1>
        <p className="text-gray-500">Triage user-flagged products and verify manufacturer corrections.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Manufacturer Resubmissions */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
            <h2 className="font-bold text-blue-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" /> Manufacturer Corrections
            </h2>
            <span className="text-xs font-bold bg-blue-200 text-blue-800 px-2 py-1 rounded-full">{resubmittedNotices.length} Awaiting</span>
          </div>
          <div className="divide-y divide-gray-100 min-h-[300px]">
            {resubmittedNotices.length === 0 ? (
              <div className="p-12"><EmptyState icon={RefreshCw} title="No corrections pending" description="Manufacturers have not submitted any new corrective actions." /></div>
            ) : (
              resubmittedNotices.map(notice => (
                <div key={notice.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm font-bold text-gray-900 block">{notice.manufacturer}</span>
                      <span className="text-xs text-gray-500">{notice.productName}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">RE-VERIFY</span>
                  </div>
                  <p className="text-xs text-gray-600 font-mono mb-4 border border-gray-200 bg-gray-50 p-2 rounded">
                    Correction submitted on {new Date().toLocaleDateString()}
                  </p>
                  <Link 
                    href={`/manufacturer/notices/${notice.id}`} // In a real app this would go to a specialized inspector verify view
                    className="w-full bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-1"
                  >
                    Review Artwork <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* User Flags */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100 bg-red-50 flex justify-between items-center">
            <h2 className="font-bold text-red-900 flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-600" /> User-Flagged Scans
            </h2>
            <span className="text-xs font-bold bg-red-200 text-red-800 px-2 py-1 rounded-full">{flaggedScans.length} Reports</span>
          </div>
          <div className="divide-y divide-gray-100 min-h-[300px]">
            {flaggedScans.length === 0 ? (
               <div className="p-12"><EmptyState icon={Flag} title="No reports" description="No non-compliant products have been flagged by users recently." /></div>
            ) : (
              flaggedScans.map(scan => (
                <div key={scan.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm font-bold text-gray-900 block">{scan.productName}</span>
                      <span className="text-xs text-gray-500">{scan.manufacturer}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded">{scan.violations.length} VIOLATIONS</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                     <AlertTriangle className="w-4 h-4 text-amber-500" />
                     <p className="text-xs text-amber-700 font-medium">Flagged by public user</p>
                  </div>
                  <Link 
                    href={`/results/${scan.id}`}
                    className="w-full bg-white border border-gray-300 text-gray-900 text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 shadow-sm"
                  >
                    Open Scan Data <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
