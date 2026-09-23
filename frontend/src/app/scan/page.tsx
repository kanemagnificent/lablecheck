"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, FileImage, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Webcam from 'react-webcam';
import { uploadScan, dataURLtoFile } from '../../lib/api';
import { useAppStore } from '../../context/store';
import { adaptBackendScan } from '../../mock/data';

type InputMode = 'CAMERA' | 'UPLOAD';
type ScanStage = 'IDLE' | 'READING' | 'EXTRACTING' | 'CHECKING' | 'SCORING' | 'COMPLETE';

export default function ScanPage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>('CAMERA');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [isCapturingBack, setIsCapturingBack] = useState(false);
  const [stage, setStage] = useState<ScanStage>('IDLE');
  const [isOffline, setIsOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const addScan = useAppStore(state => state.addScan);
  
  const webcamRef = useRef<Webcam>(null);

  // Check online status
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const capture = React.useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        if (!frontImage) {
          setFrontImage(imageSrc);
        } else if (isCapturingBack && !backImage) {
          setBackImage(imageSrc);
        }
      }
    }
  }, [webcamRef, frontImage, isCapturingBack, backImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (!frontImage) setFrontImage(reader.result as string);
        else setBackImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateProcessing = async () => {
    if (isOffline) {
      alert("Scan queued for sync.");
      router.push('/history');
      return;
    }

    if (!frontImage) return;

    try {
      setErrorMessage(null);
      setStage('READING');
      
      const frontFile = dataURLtoFile(frontImage, 'front.jpg');
      const backFile = backImage ? dataURLtoFile(backImage, 'back.jpg') : undefined;

      setTimeout(() => setStage('EXTRACTING'), 1500);

      const result = await uploadScan(frontFile, backFile);
      
      setStage('CHECKING');
      setTimeout(() => setStage('SCORING'), 1000);
      
      setTimeout(() => {
        setStage('COMPLETE');
        const adaptedScan = adaptBackendScan(result);
        addScan(adaptedScan);
        router.push(`/results/${adaptedScan.id}`);
      }, 2000);

    } catch (error: any) {
      setErrorMessage(error.message || "Failed to analyze product.");
      setStage('IDLE');
    }
  };

  const reset = () => {
    setFrontImage(null);
    setBackImage(null);
    setIsCapturingBack(false);
    setStage('IDLE');
  };

  if (stage !== 'IDLE') {
    return <LoadingState stage={stage} />;
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col min-h-[80vh]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Scan Product</h1>
        <p className="text-gray-600">Capture the front and back panels to begin verification.</p>
      </div>

      <AnimatePresence>
        {isOffline && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">
              You're offline — this scan will be processed and synced when you're back online.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Mode Selector */}
      <div className="flex bg-gray-100 p-1 rounded-lg mb-6 w-full sm:w-auto">
        <ModeButton active={mode === 'CAMERA'} onClick={() => setMode('CAMERA')} icon={<Camera size={18}/>} label="Camera" />
        <ModeButton active={mode === 'UPLOAD'} onClick={() => setMode('UPLOAD')} icon={<Upload size={18}/>} label="Upload" />
      </div>

      {/* Input Area */}
      <div className="flex-1 flex flex-col">
        {mode === 'CAMERA' && (
          <div className="relative flex-1 bg-black rounded-xl overflow-hidden min-h-[300px] mb-6 shadow-sm border border-gray-200 flex items-center justify-center">
            {(!frontImage || (isCapturingBack && !backImage)) ? (
              <>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "environment" }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                  {frontImage ? "Scan Back Panel" : "Scan Front Panel"}
                </div>
                <button 
                  onClick={capture}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors focus:ring-4 focus:ring-green-500 outline-none"
                  aria-label="Take photo"
                >
                  <div className="w-12 h-12 border-2 border-black rounded-full" />
                </button>
              </>
            ) : (
              <div className="flex gap-4 p-4 items-center justify-center w-full h-full bg-gray-100">
                <div className="relative w-1/2 max-w-[200px] aspect-[3/4] bg-white rounded-lg shadow-sm border p-2">
                   <p className="text-xs font-semibold text-gray-500 mb-2 text-center">FRONT</p>
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={frontImage} alt="Front panel" className="w-full h-auto rounded object-cover" />
                </div>
                {backImage && (
                  <div className="relative w-1/2 max-w-[200px] aspect-[3/4] bg-white rounded-lg shadow-sm border p-2">
                    <p className="text-xs font-semibold text-gray-500 mb-2 text-center">BACK</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={backImage} alt="Back panel" className="w-full h-auto rounded object-cover" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'UPLOAD' && (
          <div className="flex-1 border-2 border-dashed border-gray-300 rounded-xl mb-6 flex flex-col items-center justify-center p-8 bg-gray-50 hover:bg-gray-100 transition-colors">
            {(!frontImage || (isCapturingBack && !backImage)) ? (
              <>
                <FileImage className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-900 font-medium mb-1">Upload {frontImage ? "Back" : "Front"} Panel</p>
                <p className="text-sm text-gray-500 mb-6 text-center">Drag and drop or click to browse</p>
                <label className="bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-black">
                  Browse Files
                  <input type="file" accept="image/*" className="sr-only" onChange={handleFileUpload} />
                </label>
              </>
            ) : (
              <div className="flex gap-4 items-center justify-center w-full h-full">
                <div className="relative w-1/2 max-w-[200px]">
                   <p className="text-xs font-semibold text-gray-500 mb-2 text-center">FRONT</p>
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={frontImage} alt="Front panel" className="w-full h-auto rounded object-cover border" />
                </div>
                {backImage && (
                  <div className="relative w-1/2 max-w-[200px]">
                    <p className="text-xs font-semibold text-gray-500 mb-2 text-center">BACK</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={backImage} alt="Back panel" className="w-full h-auto rounded object-cover border" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}



        {/* Actions */}
        {frontImage && (
          <div className="flex flex-col sm:flex-row gap-3 mt-auto">
            {!backImage && (
              <button 
                onClick={() => setIsCapturingBack(true)}
                className="flex-1 bg-white border border-gray-300 text-gray-900 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Add Back Panel
              </button>
            )}
            <button 
              onClick={reset}
              className="flex-1 bg-white border border-gray-300 text-red-600 py-3 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Retake
            </button>
            <button 
              onClick={simulateProcessing}
              className="flex-[2] bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {isOffline ? 'Queue for Sync' : 'Analyze Product'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

const STAGES = {
  IDLE: '',
  READING: 'Reading front panel...',
  EXTRACTING: 'Extracting statutory declarations...',
  CHECKING: 'Checking against Legal Metrology Rules...',
  SCORING: 'Calculating compliance score...',
  COMPLETE: 'Done!'
};

function LoadingState({ stage }: { stage: ScanStage }) {
  const stageKeys = Object.keys(STAGES).filter(k => k !== 'IDLE' && k !== 'COMPLETE');
  const currentIndex = stageKeys.indexOf(stage);

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <div className="mb-10 text-center">
        <motion.div 
          className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">Analyzing Label</h2>
        <p className="text-gray-500 font-mono text-sm">{STAGES[stage]}</p>
      </div>

      <div className="space-y-4">
        {stageKeys.map((key, index) => {
          const isActive = key === stage;
          const isPast = index < currentIndex;
          
          return (
            <motion.div 
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isActive || isPast ? 1 : 0.4, x: 0 }}
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                isActive ? 'bg-white border-gray-900 shadow-sm' : 
                isPast ? 'bg-gray-50 border-gray-200' : 'bg-transparent border-transparent'
              }`}
            >
              <div className="shrink-0">
                {isPast ? (
                  <CheckCircle2 className="text-green-500 w-6 h-6" />
                ) : isActive ? (
                  <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <span className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                {STAGES[key as keyof typeof STAGES]}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
