"use client";

import React, { useState } from 'react';
import { useAppStore } from '../../../../context/store';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, Upload, AlertTriangle, Info, FileImage } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateNoticeStatus as updateNoticeStatusApi } from '../../../../lib/api';

export default function ManufacturerNoticeDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { notices, updateNoticeStatus } = useAppStore();
  
  const notice = notices.find(n => n.id === id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correctionImage, setCorrectionImage] = useState<string | null>(null);
  const [statement, setStatement] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!notice) {
    return <div className="p-8 text-center">Notice not found</div>;
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCorrectionImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!correctionImage) {
      setErrorMsg("Please upload a revised label artwork.");
      return;
    }
    if (statement.trim().length < 20) {
      setErrorMsg("Statement of correction must be at least 20 characters long.");
      return;
    }
    setErrorMsg("");
    
    setIsSubmitting(true);
    try {
      await updateNoticeStatusApi(notice!.id, 'SUBMITTED');
      updateNoticeStatus(notice!.id, 'SUBMITTED'); // Update local store
    } catch (error) {
      alert("Failed to submit correction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stages = ['ISSUED', 'UNDER_CORRECTION', 'SUBMITTED', 'RESOLVED'];
  let currentStageIndex = stages.indexOf(notice.status);
  if (notice.status === 'REJECTED') currentStageIndex = 1; // back to correction

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8">
      <button onClick={() => router.back()} className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 group">
        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
      </button>

      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded">NOTICE ID: {notice.id}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight mb-2">{notice.productName}</h1>
            <p className="text-gray-500 font-mono text-sm">Issued: {notice.issuedAt} • Deadline: <span className="text-red-600 font-semibold">{notice.deadline}</span></p>
          </div>
          
          <div className="text-right">
            <span className={`inline-block px-4 py-2 rounded-lg text-sm font-bold tracking-wide uppercase ${
              notice.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
              notice.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
              notice.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
              'bg-amber-100 text-amber-800'
            }`}>
              {notice.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Stepper */}
        <div className="relative pt-4 pb-8 mb-4 border-b border-gray-100">
          <div className="absolute top-8 left-6 right-6 h-1 bg-gray-100 rounded-full" />
          <div className="absolute top-8 left-6 h-1 bg-gray-900 rounded-full transition-all duration-500" style={{ width: `${(Math.max(0, currentStageIndex) / (stages.length - 1)) * 100}%` }} />
          
          <div className="flex justify-between relative z-10">
            {stages.map((stage, i) => {
              const isCompleted = i <= currentStageIndex;
              const isCurrent = i === currentStageIndex;
              return (
                <div key={stage} className="flex flex-col items-center gap-3 w-24">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isCompleted ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-300 text-gray-300'
                  } ${isCurrent && 'ring-4 ring-gray-100'}`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-bold text-center uppercase tracking-wider ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                    {stage.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Violations */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Cited Violations</h3>
          <div className="space-y-4">
            {notice.violations.map(v => (
              <div key={v.id} className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded">{v.ruleCitation}</span>
                    {v.field.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-sm tracking-wide">{v.severity}</span>
                </div>
                <p className="text-sm text-gray-700 mb-2"><span className="font-medium text-gray-900">Requirement:</span> {v.ruleRequirement}</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white p-3 rounded border border-gray-200">
                     <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Detected</span>
                     <span className="font-mono text-xs text-red-600">{v.foundData || "NOT DETECTED"}</span>
                  </div>
                  <div className="flex-1 bg-white p-3 rounded border border-gray-200">
                     <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Expected</span>
                     <span className="font-mono text-xs text-gray-600">{v.expectedData}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Corrective Action Form */}
      <AnimatePresence>
        {(notice.status === 'ISSUED' || notice.status === 'UNDER_CORRECTION' || notice.status === 'REJECTED') && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-2">Submit Corrective Action</h2>
            <p className="text-gray-500 text-sm mb-6">Upload the revised packaging artwork for re-verification by the Inspector.</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Revised Label Artwork</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden group">
                  {correctionImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={correctionImage} alt="Revised" className="w-full max-h-[300px] object-contain" />
                  ) : (
                    <>
                      <FileImage className="w-10 h-10 text-gray-400 mb-3 group-hover:text-gray-600 transition-colors" />
                      <p className="text-sm font-medium text-gray-900 mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileUpload} required className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Statement of Correction</label>
                <textarea 
                  required
                  value={statement}
                  onChange={(e) => {
                    setStatement(e.target.value);
                    if (notice.status === 'ISSUED') updateNoticeStatus(notice.id, 'UNDER_CORRECTION');
                  }}
                  placeholder="Describe the changes made to comply with the notice (minimum 20 characters)..."
                  className="w-full h-32 p-4 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900 outline-none resize-y"
                />
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button 
                  type="submit" 
                  disabled={isSubmitting || !correctionImage}
                  className="bg-gray-900 text-white font-medium px-8 py-3 rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Submitting...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Submit for Review</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
