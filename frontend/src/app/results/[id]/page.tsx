"use client";

import { useAppStore } from '../../../context/store';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { ShieldAlert, Info, ArrowLeft, Download, FileText, CheckCircle, AlertCircle, AlertTriangle, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { issueNotice } from '../../../lib/api';

export default function ResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { scans, role, addNotice } = useAppStore();
  
  const scan = scans.find(s => s.id === id);
  const [expandedViolation, setExpandedViolation] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noticeSent, setNoticeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleIssueNotice = async () => {
    if (!scan) return;
    setIsSending(true);
    try {
      const response = await issueNotice(scan.id, {
        product_name: scan.productName,
        manufacturer: scan.manufacturer,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days
        violations: scan.violations
      });
      // Update local store with the new notice
      addNotice({
        id: response.notice_id,
        scanId: scan.id,
        productName: scan.productName,
        manufacturer: scan.manufacturer,
        issuedAt: new Date().toISOString().split('T')[0],
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'ISSUED',
        violations: scan.violations
      });
      setNoticeSent(true);
    } catch (error) {
      alert("Failed to issue notice");
    } finally {
      setIsSending(false);
    }
  };

  // Count severities (Must be before early return)
  const counts = useMemo(() => {
    if (!scan) return { CRITICAL: 0, MAJOR: 0, MINOR: 0 };
    return scan.violations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, { CRITICAL: 0, MAJOR: 0, MINOR: 0 });
  }, [scan]);

  if (!scan) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Scan Not Found</h2>
        <button onClick={() => router.push('/history')} className="text-blue-600 underline">Return to History</button>
      </div>
    );
  }

  const isConsumer = role === 'USER';

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => router.back()} className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 group">
          <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Back
        </button>
        {(role === 'INSPECTOR' || role === 'MANUFACTURER') && (
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" /> Export Editable PDF Report
          </button>
        )}
      </div>

      {/* Header / Score */}
      <div className="flex flex-col md:flex-row gap-8 bg-white p-8 rounded-2xl border border-gray-200 mb-8 shadow-sm">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded tracking-wide">{scan.category}</span>
            <span className="font-mono text-[10px] text-gray-400">ID: {scan.id}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight mb-2">{scan.productName}</h1>
          <p className="text-gray-500 font-medium">{scan.manufacturer}</p>
        </div>
        
        <div className="flex flex-col md:items-end justify-center">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              scan.status === 'COMPLIANT' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
              scan.status === 'WARNING' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' :
              'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
            }`} />
            <span className="text-2xl font-bold tracking-tight">
              {scan.status.replace('_', ' ')}
            </span>
          </div>
          <span className="text-sm text-gray-500 mt-1 font-medium">Compliance Score: {scan.score}/100</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details (Left 2/3) */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Statutory Comparison Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-900">Found Data vs Statutory Rules</h2>
              {isConsumer && <span className="text-xs text-gray-500">Simplified View</span>}
            </div>
            <div className="divide-y divide-gray-100">
              {(!scan.extractedData || scan.extractedData.length === 0) ? (
                <div className="p-8 text-center text-gray-500">No data could be extracted.</div>
              ) : (
                scan.extractedData.map((data, i) => {
                  const isViolation = !data.value;
                  return (
                    <div key={i} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex gap-4">
                        <div className="shrink-0 mt-1">
                          {isViolation ? <AlertTriangle className="text-[#dc2626] w-5 h-5" /> : <CheckCircle className="text-[#22c55e] w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-3">
                            <span className="font-semibold text-gray-900 flex items-center gap-2">
                              {!isConsumer && <span className="font-mono text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Rule 6(1)</span>}
                              {data.label}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wide ${
                              isViolation ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'
                            }`}>{isViolation ? 'MISSING' : 'DETECTED'}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden mt-2">
                            <div className="bg-white p-3">
                              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Found Data (OCR)</span>
                              <span className={`font-mono text-sm ${isViolation ? 'text-red-500' : 'text-gray-900'}`}>{data.value || "NOT DETECTED"}</span>
                            </div>
                            <div className="bg-gray-50 p-3">
                              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Statutory Rule</span>
                              <span className="font-mono text-sm text-gray-600">{data.expected}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {role === 'INSPECTOR' && scan.status !== 'COMPLIANT' && (
            <div className="bg-gray-900 rounded-xl p-6 text-white shadow-md">
              <h3 className="font-bold mb-2 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-400" /> Enforcement Action Required</h3>
              <p className="text-sm text-gray-300 mb-4">This product has critical or major violations. Issue a notice to the manufacturer directly from the system.</p>
              <button onClick={() => setIsModalOpen(true)} className="bg-white text-gray-900 px-4 py-2 rounded-md font-medium text-sm hover:bg-gray-100 w-full sm:w-auto text-center transition-colors">
                Review & Issue Notice
              </button>
            </div>
          )}

          {role === 'USER' && scan.status !== 'COMPLIANT' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-900 shadow-sm">
              <h3 className="font-bold mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" /> Report this product</h3>
              <p className="text-sm text-red-700 mb-4">This product appears to violate mandatory packaging rules. You can flag this directly to the Legal Metrology department.</p>
              <button 
                onClick={() => alert('Product flagged to Inspector Queue!')}
                className="bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-red-700 w-full sm:w-auto text-center transition-colors shadow-sm"
              >
                Report to Enforcement
              </button>
            </div>
          )}

          {role === 'MANUFACTURER' && scan.status !== 'COMPLIANT' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-blue-900 shadow-sm">
              <h3 className="font-bold mb-2 flex items-center gap-2"><Info className="w-5 h-5 text-blue-600" /> Product Improvement Feedback</h3>
              <p className="text-sm text-blue-800 mb-4">The AI has analyzed your label and provided the following actionable feedback to achieve full compliance before enforcement action is taken.</p>
              
              <ul className="list-disc pl-5 space-y-2 text-sm text-blue-800 font-medium">
                {scan.aiAnalysis?.correctiveActions?.map((action, i) => (
                  <li key={i}>{action}</li>
                )) || <li>Ensure all extracted text matches statutory requirements perfectly.</li>}
              </ul>
            </div>
          )}

        </div>

        {/* Sidebar (Right 1/3) */}
        <div className="space-y-6">
          
          {/* Annotated Label Image */}
          <div className="bg-white p-4 rounded-xl border border-gray-200">
             <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Analyzed Label</h3>
             <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100 aspect-square flex items-center justify-center group">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={scan.imageFront} alt="Product label" className="w-full h-full object-cover" />
             </div>
          </div>

          {/* Toxicity Health-Risk */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">Ingredient Safety</h3>
              {scan.toxicityScore !== undefined && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${scan.toxicityScore < 80 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                  Score: {scan.toxicityScore}/100
                </span>
              )}
            </div>
            <div className="p-4">
              {scan.toxicityFlags.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-[#22c55e] font-medium bg-green-50 p-2 rounded">
                  <CheckCircle className="w-4 h-4" /> No high-risk ingredients detected.
                </div>
              ) : (
                <div className="space-y-4">
                  {(scan.toxicityScore ?? 100) < 80 && (
                    <div className="flex gap-2 items-start bg-amber-50 text-amber-900 p-3 rounded-lg border border-amber-200 text-sm font-medium">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <p>Caution: High-Risk Ingredients</p>
                        <p className="text-xs font-normal opacity-90 mt-0.5">Please review the flagged ingredients below before consumption.</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    {scan.toxicityFlags.map((flag, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 text-sm">{flag.ingredient}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          flag.level === 'HIGH' ? 'bg-[#991b1b] text-white' : 'bg-[#f59e0b] text-white'
                        }`}>{flag.level} RISK</span>
                      </div>
                      <p className="text-xs text-gray-600">{flag.reason}</p>
                    </div>
                  ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4 border-t pt-2">* Informational only. Not part of Legal Metrology compliance.</p>
                </div>
              )}
            </div>
          </div>

          {/* Carbon Footprint */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Carbon Footprint</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <span className="text-xl">🌱</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Estimated Emissions</p>
                  <p className="text-base font-bold text-gray-900">{scan.carbonFootprint}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Enforcement Modal (Inspector Only) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-gray-100"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Issue Formal Notice</h2>
                  <p className="text-sm text-gray-500 font-medium">To: {scan.manufacturer}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 p-2 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!noticeSent ? (
                <>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
                    <h4 className="font-semibold text-red-900 text-sm mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Notice of Non-Compliance
                    </h4>
                    <p className="text-sm text-red-800 mb-3">
                      This formal notice cites {scan.violations.length} violations of the Legal Metrology (Packaged Commodities) Rules, 2011.
                    </p>
                    <ul className="text-xs text-red-700 list-disc pl-4 space-y-1 font-medium">
                      {scan.violations.map(v => (
                        <li key={v.id}>{v.ruleCitation}: {v.field.replace('_', ' ')}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={handleIssueNotice}
                      disabled={isSending}
                      className="flex-1 bg-gray-900 text-white font-medium px-4 py-3 rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Dispatch Notice
                    </button>
                    <button 
                      onClick={() => {
                        window.print();
                        handleIssueNotice();
                      }}
                      disabled={isSending}
                      className="flex-1 bg-white border border-gray-200 text-gray-900 font-medium px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4" />
                      Export PDF & Dispatch
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Notice Prepared</h3>
                  <p className="text-gray-500 mb-6">The enforcement workflow has been initiated successfully.</p>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="bg-gray-100 text-gray-900 font-medium px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
