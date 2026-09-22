"use client";

import { motion } from 'framer-motion';
import { useAppStore } from '../context/store';
import { useRouter } from 'next/navigation';
import { ScanLine, ShieldCheck, Factory, ChevronRight } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

export default function LandingPage() {
  const setRole = useAppStore(state => state.setRole);
  const router = useRouter();
  const { t } = useTranslation();

  const handleRoleSelect = (role: 'USER' | 'MANUFACTURER' | 'INSPECTOR') => {
    if (role === 'USER') {
      setRole(role);
      router.push('/scan');
    }
    if (role === 'MANUFACTURER') router.push('/auth/manufacturer');
    if (role === 'INSPECTOR') router.push('/auth/inspector');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center max-w-4xl mx-auto px-6">
      
      {/* Animated Hero Graphic - Premium Monochromatic */}
      <motion.div 
        className="relative w-56 h-72 bg-white border border-gray-200/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-14 flex flex-col items-center justify-start p-5"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="w-16 h-16 bg-gray-50/80 border border-gray-100 rounded-xl mb-6 flex items-center justify-center shadow-sm">
          <ScanLine className="w-7 h-7 text-gray-700" />
        </div>
        
        {/* Animated Scanning Line */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[1px] bg-gray-900 shadow-[0_0_12px_rgba(0,0,0,0.5)]"
          initial={{ top: '0%' }}
          animate={{ top: '100%' }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />

        {/* Animated Extracted Data Boxes */}
        <div className="w-full flex flex-col gap-4 mt-2">
          {[1, 2, 3].map((i) => (
            <motion.div 
              key={i}
              className="h-3 bg-gray-50 rounded-full w-full overflow-hidden relative border border-gray-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 + (i * 0.15), duration: 0.4 }}
            >
              <motion.div 
                className="absolute left-0 top-0 bottom-0 bg-gray-300 w-full"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.0 + (i * 0.15), duration: 0.5, ease: "easeInOut" }}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Typography & Copy */}
      <motion.h1 
        className="text-5xl sm:text-7xl font-bold text-gray-900 tracking-tight mb-6 leading-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {t('heroTitle').split(',')[0]}<span className="text-gray-400">{t('heroTitle').includes(',') ? ',' + t('heroTitle').split(',')[1] : ''}</span>
      </motion.h1>
      
      <motion.p 
        className="text-lg sm:text-xl text-gray-500 mb-12 max-w-2xl font-light"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        {t('heroSubtitle')}
      </motion.p>

      {/* Entry Paths */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-3xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <button 
          onClick={() => handleRoleSelect('USER')}
          className="group flex-1 flex flex-col items-start gap-4 bg-gray-900 hover:bg-black text-white p-6 rounded-2xl transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 text-left"
          aria-label={t('scanShopper')}
        >
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="block font-semibold text-lg">{t('scanShopper')}</span>
            <span className="text-xs text-gray-400 font-medium">No login required</span>
          </div>
        </button>

        <button 
          onClick={() => handleRoleSelect('MANUFACTURER')}
          className="group flex-1 flex flex-col items-start gap-4 bg-white hover:bg-gray-50 border border-gray-200 p-6 rounded-2xl transition-all shadow-sm hover:shadow hover:-translate-y-0.5 text-left"
          aria-label={t('signInManufacturer')}
        >
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Factory className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <span className="block font-semibold text-gray-900 text-lg">{t('signInManufacturer')}</span>
            <span className="text-xs text-gray-500 font-medium">Manage your products</span>
          </div>
        </button>

        <button 
          onClick={() => handleRoleSelect('INSPECTOR')}
          className="group flex-1 flex flex-col items-start gap-4 bg-white hover:bg-gray-50 border border-gray-200 p-6 rounded-2xl transition-all shadow-sm hover:shadow hover:-translate-y-0.5 text-left"
          aria-label={t('signInInspector')}
        >
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <span className="block font-semibold text-gray-900 text-lg">{t('signInInspector')}</span>
            <span className="text-xs text-gray-500 font-medium">Audit & enforce rules</span>
          </div>
        </button>
      </motion.div>

    </div>
  );
}
