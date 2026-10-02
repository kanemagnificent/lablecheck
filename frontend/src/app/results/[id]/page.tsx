"use client";

import { useAppStore } from '../../../context/store';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { ShieldAlert, Info, ArrowLeft, Download, FileText, CheckCircle, AlertCircle, AlertTriangle, X, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { issueNotice, getIngredientAlternatives } from '../../../lib/api';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';

export default function ResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { scans, role, addNotice } = useAppStore();
  
  const scan = scans.find(s => s.id === id);
  const [expandedViolation, setExpandedViolation] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [noticeSent, setNoticeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [loadingAlternativesFor, setLoadingAlternativesFor] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<Record<string, {name: string, reason: string}[]>>({});
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);

  const handleFetchAlternatives = async (ingredient: string) => {
    if (alternatives[ingredient]) return; // already fetched
    setLoadingAlternativesFor(ingredient);
    try {
      const data = await getIngredientAlternatives(ingredient);
      setAlternatives(prev => ({ ...prev, [ingredient]: data.alternatives }));
    } catch (error) {
      console.error("Failed to fetch alternatives", error);
    } finally {
      setLoadingAlternativesFor(null);
    }
  };

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

      // Construct Official Notice Email
      const manufacturerEmail = `compliance@${scan.manufacturer.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
      const subject = encodeURIComponent(`URGENT: Legal Metrology Notice of Non-Compliance - ${scan.productName}`);
      let body = `To the Compliance Officer, ${scan.manufacturer},\n\n`;
      body += `This is an official notice from the Department of Legal Metrology.\n\n`;
      body += `During a recent inspection, the following product was found to be in violation of the Legal Metrology (Packaged Commodities) Rules, 2011:\n`;
      body += `Product: ${scan.productName}\n\n`;
      body += `VIOLATIONS:\n`;
      scan.violations.forEach(v => {
        body += `- ${v.field.replace('_', ' ')} (Rule: ${v.ruleCitation})\n`;
      });
      body += `\nYou are required to rectify these issues within 14 days. Failure to comply will result in further enforcement action and compounding fees.\n`;
      body += `\n*** INSPECTOR INSTRUCTIONS: PLEASE ATTACH THE DOWNLOADED PDF REPORT TO THIS EMAIL BEFORE SENDING ***\n\n`;
      body += `Sincerely,\nInspector of Legal Metrology`;

      const mailtoLink = `mailto:${manufacturerEmail}?subject=${subject}&body=${encodeURIComponent(body)}`;

      // Trigger the native email client
      setTimeout(() => {
        window.location.href = mailtoLink;
        setNoticeSent(true);
      }, 800);

    } catch (error) {
      toast.error("Failed to issue notice");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!scan) return;
    setIsSendingReport(true);
    
    // Construct a highly detailed, professional email body
    const subject = encodeURIComponent(`Legal Metrology Violation Report: ${scan.productName}`);
    let body = `Dear Inspector,\n\nI am reporting a potential Legal Metrology (Packaged Commodities) violation for the following product:\n\n`;
    body += `Product Name: ${scan.productName}\n`;
    body += `Manufacturer: ${scan.manufacturer}\n\n`;
    
    body += `DETECTED VIOLATIONS (AI Analysis):\n`;
    scan.violations.forEach(v => {
      body += `- ${v.field.replace('_', ' ')} (Rule: ${v.ruleCitation})\n`;
    });
    
    if (reportText.trim()) {
      body += `\nADDITIONAL CONSUMER FIELD NOTES:\n${reportText}\n`;
    }
    
    body += `\nPlease investigate this matter.\n\nThank you.`;
    
    const mailtoLink = `mailto:inspector.mh@gov.in?subject=${subject}&body=${encodeURIComponent(body)}`;
    
    // Trigger the native email client
    setTimeout(() => {
      window.location.href = mailtoLink;
      setIsSendingReport(false);
      setReportSent(true);
    }, 800);
  };

  const handleGeneratePDF = () => {
    if (!scan) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("DEPARTMENT OF LEGAL METROLOGY", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.text("NOTICE OF NON-COMPLIANCE", 105, 30, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    // Details
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 45);
    doc.text(`Notice ID: LMN-${scan.id.substring(0, 8).toUpperCase()}`, 140, 45);
    
    doc.setFont("helvetica", "bold");
    doc.text(`To:`, 20, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`The Compliance Officer`, 20, 67);
    doc.text(`${scan.manufacturer}`, 20, 74);
    
    doc.text(`Subject: Violation of Legal Metrology (Packaged Commodities) Rules, 2011`, 20, 90);
    
    let yPos = 105;
    
    doc.text(`This is to officially notify you that during a recent inspection, the following product was`, 20, yPos);
    yPos += 7;
    doc.text(`found to be in violation of mandatory packaging regulations:`, 20, yPos);
    
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text(`Product Details:`, 20, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 7;
    doc.text(`Name: ${scan.productName}`, 25, yPos);
    yPos += 7;
    doc.text(`Category: ${scan.category}`, 25, yPos);
    
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text(`Violations Detected:`, 20, yPos);
    doc.setFont("helvetica", "normal");
    
    scan.violations.forEach((v, index) => {
      yPos += 7;
      doc.text(`${index + 1}. ${v.field.replace('_', ' ')}`, 25, yPos);
      yPos += 5;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Rule Citation: ${v.ruleCitation}`, 30, yPos);
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
    });
    
    yPos += 20;
    doc.text(`You are hereby directed to rectify the aforementioned violations within 14 days of`, 20, yPos);
    yPos += 7;
    doc.text(`receiving this notice. Failure to comply will result in further legal action.`, 20, yPos);
    
    yPos += 25;
    doc.text(`Issued by,`, 140, yPos);
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Inspector of Legal Metrology`, 140, yPos);
    
    doc.save(`Legal_Notice_${scan.productName.replace(/\s+/g, '_')}.pdf`);
    toast.success("Legal Notice PDF Generated Successfully!");
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
            onClick={handleGeneratePDF} 
            className="flex items-center gap-2 text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Download Legal PDF
          </button>
        )}
      </div>

      {/* Header / Score */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row gap-8 bg-white p-8 rounded-2xl border border-gray-200 mb-8 shadow-sm"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded tracking-wide">{scan.category}</span>
            <span className="font-mono text-[10px] text-gray-400">ID: {scan.id}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight mb-2">{scan.productName}</h1>
          <p className="text-gray-500 font-medium">{scan.manufacturer}</p>
        </div>
        
        <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-4">
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
          <div className="flex items-center gap-3">
            <ScoreRing score={scan.score} status={scan.status} />
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Compliance</span>
              <span className="text-sm font-semibold text-gray-700">Score</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
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
                onClick={() => setIsReportModalOpen(true)}
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
             <button 
               onClick={() => setIsImageExpanded(true)}
               className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100 aspect-square flex items-center justify-center group w-full cursor-pointer outline-none focus:ring-2 focus:ring-gray-900"
             >
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={scan.imageFront} alt="Product label" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                 <span className="opacity-0 group-hover:opacity-100 bg-white/95 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                   Click to Enlarge
                 </span>
               </div>
             </button>
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
                    <div key={i} className="flex flex-col gap-2 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900 text-sm">{flag.ingredient}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            flag.level === 'HIGH' ? 'bg-[#991b1b] text-white' : 'bg-[#f59e0b] text-white'
                          }`}>{flag.level} RISK</span>
                        </div>
                        <p className="text-xs text-gray-600">{flag.reason}</p>
                      </div>
                      
                      {role === 'MANUFACTURER' && (
                        <div>
                          {!alternatives[flag.ingredient] ? (
                            <button 
                              onClick={() => handleFetchAlternatives(flag.ingredient)}
                              disabled={loadingAlternativesFor === flag.ingredient}
                              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md"
                            >
                              {loadingAlternativesFor === flag.ingredient ? (
                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              Suggest Alternatives
                            </button>
                          ) : (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-1"
                            >
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3 text-blue-500"/> AI Alternatives</p>
                              <ul className="space-y-2">
                                {alternatives[flag.ingredient].map((alt, idx) => (
                                  <li key={idx} className="text-xs">
                                    <span className="font-semibold text-gray-900 block">{alt.name}</span>
                                    <span className="text-gray-500">{alt.reason}</span>
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </div>
                      )}
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
      </motion.div>

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
                        handleGeneratePDF();
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

      {/* Consumer Report Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-gray-100"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">File Field Report</h2>
                  <p className="text-sm text-gray-500 font-medium">Product: {scan.productName}</p>
                </div>
                <button 
                  onClick={() => { setIsReportModalOpen(false); setReportSent(false); setReportText(""); }} 
                  className="text-gray-400 hover:text-gray-700 bg-gray-50 p-2 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!reportSent ? (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Details</label>
                    <textarea 
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="Describe where you found this product (e.g. Store name, location), batch number, or any other relevant details..."
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none h-32 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-2">This report, along with the AI analysis and label images, will be securely emailed to the Legal Metrology Enforcement Division.</p>
                  </div>
                  <button 
                    onClick={handleSubmitReport}
                    disabled={isSendingReport || reportText.trim() === ""}
                    className="w-full bg-red-600 text-white font-medium px-4 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSendingReport ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit Report & Send Email
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Report Submitted</h3>
                  <p className="text-gray-500 mb-6">Your field report and evidence have been successfully emailed to the enforcement inspector.</p>
                  <button 
                    onClick={() => { setIsReportModalOpen(false); setReportSent(false); setReportText(""); }}
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

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {isImageExpanded && (
          <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[60]" onClick={() => setIsImageExpanded(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl w-full max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsImageExpanded(false)} 
                className="absolute -top-12 right-0 text-white hover:text-gray-300 bg-white/10 p-2 rounded-full transition-colors focus:outline-none"
              >
                <X className="w-6 h-6" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={scan.imageFront} alt="Expanded Product label" className="w-full h-full object-contain rounded-lg shadow-2xl" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Helper component for Score Ring
function ScoreRing({ score, status }: { score: number, status: string }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const color = status === 'COMPLIANT' ? 'text-green-500' : status === 'WARNING' ? 'text-amber-500' : 'text-red-500';
  
  return (
    <div className="relative flex items-center justify-center w-16 h-16">
      <svg className="transform -rotate-90 w-16 h-16">
        <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-100" />
        <motion.circle 
          cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="4" fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          className={color}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-sm font-bold text-gray-900">{score}</span>
    </div>
  );
}
