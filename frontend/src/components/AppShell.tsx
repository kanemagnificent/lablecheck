"use client";

import React, { ReactNode } from 'react';
import { useAppStore } from '../context/store';
import { Locale } from '../mock/data';
import Link from 'next/link';
import { Shield, Home, History, ScanLine, BookOpen, LayoutDashboard, Settings, User, CheckCircle, LogOut, ChevronDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '../lib/i18n';
import { fetchLogs, fetchNotices } from '../lib/api';
import { adaptBackendScan } from '../mock/data';
import { useEffect, useState } from 'react';

export default function AppShell({ children }: { children: ReactNode }) {
  const { role, setRole, locale, setLocale, isInitialized, setInitialized, setScans, setNotices, isAuthenticated, logout } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      Promise.all([fetchLogs(), fetchNotices()])
        .then(([logsData, noticesData]) => {
          if (Array.isArray(logsData)) {
            setScans(logsData.map(adaptBackendScan));
          }
          if (Array.isArray(noticesData)) {
            setNotices(noticesData);
          }
          setInitialized(true);
        })
        .catch(() => {
          // Silent catch to prevent sensitive errors from leaking to console
        });
    }
  }, [isInitialized, setScans, setNotices, setInitialized]);

  useEffect(() => {
    // Basic route protection
    if (!isAuthenticated && role !== 'USER' && !pathname.includes('/auth/')) {
      if (role === 'MANUFACTURER') router.push('/auth/manufacturer');
      if (role === 'INSPECTOR') router.push('/auth/inspector');
    }
  }, [isAuthenticated, role, pathname, router]);

  // Don't render the shell nav on auth pages to give them a clean slate
  if (pathname.includes('/auth/')) {
    return <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-gray-900 w-6 h-6" />
            <Link href="/" className="font-bold text-xl tracking-tight">LabelCheck</Link>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={locale} 
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-gray-900 outline-none uppercase"
              aria-label="Select Language"
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
            </select>

            {/* Auth UI */}
            {!isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-3">
                <Link href="/auth/manufacturer" className="text-sm font-medium text-gray-600 hover:text-gray-900">For Brands</Link>
                <Link href="/auth/inspector" className="text-sm font-medium bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-black transition-colors">Inspector Login</Link>
              </div>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs">
                    {role === 'MANUFACTURER' ? 'M' : 'I'}
                  </div>
                  <span className="hidden sm:inline">{role === 'MANUFACTURER' ? 'Acme Corp' : 'Inspector'}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                
                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 mb-1">
                        <p className="text-sm font-medium text-gray-900">{role === 'MANUFACTURER' ? 'Acme Corporation' : 'Official Portal'}</p>
                        <p className="text-xs text-gray-500 truncate">{role === 'MANUFACTURER' ? 'compliance@acmecorp.com' : 'inspector.mh@gov.in'}</p>
                      </div>
                      <button 
                        onClick={() => {
                          logout();
                          setIsProfileOpen(false);
                          router.push('/');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Top Nav for Desktop (Hidden on mobile) */}
      <nav className="hidden sm:block border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-6">
          {role === 'USER' && (
            <>
              <Link href="/" className={`text-sm font-medium ${pathname === '/' ? 'text-gray-900 border-b-2 border-gray-900 h-full flex items-center' : 'text-gray-500 hover:text-gray-900'}`}>{t('scanProduct')}</Link>
              <Link href="/history" className={`text-sm font-medium ${pathname === '/history' ? 'text-gray-900 border-b-2 border-gray-900 h-full flex items-center' : 'text-gray-500 hover:text-gray-900'}`}>{t('history')}</Link>
              <Link href="/rulebook" className={`text-sm font-medium ${pathname === '/rulebook' ? 'text-gray-900 border-b-2 border-gray-900 h-full flex items-center' : 'text-gray-500 hover:text-gray-900'}`}>{t('rulebook')}</Link>
            </>
          )}
          {role === 'MANUFACTURER' && (
            <>
              <Link href="/scan" className={`text-sm font-medium ${pathname === '/scan' ? 'text-gray-900 border-b-2 border-gray-900 h-full flex items-center' : 'text-gray-500 hover:text-gray-900'}`}>{t('scanProduct')}</Link>
              <Link href="/manufacturer/dashboard" className={`text-sm font-medium ${pathname.includes('dashboard') ? 'text-gray-900 border-b-2 border-gray-900 h-full flex items-center' : 'text-gray-500 hover:text-gray-900'}`}>{t('dashboard')}</Link>
              <Link href="/manufacturer/products" className={`text-sm font-medium ${pathname.includes('products') ? 'text-gray-900 border-b-2 border-gray-900 h-full flex items-center' : 'text-gray-500 hover:text-gray-900'}`}>{t('products')}</Link>
              <Link href="/manufacturer/rulebook" className={`text-sm font-medium ${pathname.includes('rulebook') ? 'text-gray-900 border-b-2 border-gray-900 h-full flex items-center' : 'text-gray-500 hover:text-gray-900'}`}>{t('rulebook')}</Link>
            </>
          )}
          {role === 'INSPECTOR' && (
            <>
              <Link href="/scan" className={`text-sm font-medium ${pathname === '/scan' ? 'text-gray-900 border-b-2 border-gray-900 h-full flex items-center' : 'text-gray-500 hover:text-gray-900'}`}>{t('scanProduct')}</Link>
              <Link href="/inspector/dashboard" className={`text-sm font-medium ${pathname.includes('dashboard') ? 'text-gray-900 border-b-2 border-gray-900 h-full flex items-center' : 'text-gray-500 hover:text-gray-900'}`}>{t('dashboard')}</Link>
              <Link href="/inspector/queue" className={`text-sm font-medium ${pathname.includes('queue') ? 'text-gray-900 border-b-2 border-gray-900 h-full flex items-center' : 'text-gray-500 hover:text-gray-900'}`}>{t('queue')}</Link>
            </>
          )}
        </div>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 sm:hidden pb-safe z-50">
        <div className="flex justify-around items-center h-16">
          {role === 'USER' && (
            <>
              <Link href="/" className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/' || pathname === '/scan' ? 'text-gray-900' : 'text-gray-400'}`}>
                <ScanLine className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{t('scanProduct')}</span>
              </Link>
              <Link href="/history" className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/history' ? 'text-gray-900' : 'text-gray-400'}`}>
                <History className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{t('history')}</span>
              </Link>
            </>
          )}
          {role === 'MANUFACTURER' && (
            <>
              <Link href="/scan" className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/scan' ? 'text-gray-900' : 'text-gray-400'}`}>
                <ScanLine className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{t('scanProduct')}</span>
              </Link>
              <Link href="/manufacturer/dashboard" className={`flex flex-col items-center justify-center w-full h-full ${pathname.includes('dashboard') ? 'text-gray-900' : 'text-gray-400'}`}>
                <LayoutDashboard className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{t('dashboard')}</span>
              </Link>
              <Link href="/manufacturer/products" className={`flex flex-col items-center justify-center w-full h-full ${pathname.includes('products') ? 'text-gray-900' : 'text-gray-400'}`}>
                <BookOpen className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{t('products')}</span>
              </Link>
            </>
          )}
          {role === 'INSPECTOR' && (
            <>
              <Link href="/scan" className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/scan' ? 'text-gray-900' : 'text-gray-400'}`}>
                <ScanLine className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{t('scanProduct')}</span>
              </Link>
              <Link href="/inspector/dashboard" className={`flex flex-col items-center justify-center w-full h-full ${pathname.includes('dashboard') ? 'text-gray-900' : 'text-gray-400'}`}>
                <LayoutDashboard className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{t('dashboard')}</span>
              </Link>
              <Link href="/inspector/queue" className={`flex flex-col items-center justify-center w-full h-full ${pathname.includes('queue') ? 'text-gray-900' : 'text-gray-400'}`}>
                <Shield className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{t('queue')}</span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
