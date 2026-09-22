"use client";

import React, { useState } from 'react';
import { Shield, ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '../../../context/store';

export default function InspectorAuth() {
  const router = useRouter();
  const login = useAppStore(state => state.login);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("inspector.mh@gov.in");
  const [password, setPassword] = useState("securepassword");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSimulatedLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!email || !email.includes('@gov.in')) {
      setErrorMsg("Unauthorized: Must use an official @gov.in email address.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    
    setErrorMsg("");
    setIsLoading(true);
    setTimeout(() => {
      login('INSPECTOR');
      router.push('/inspector/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        
        {/* Top Header */}
        <div className="bg-gray-900 px-8 py-6 text-center border-b-4 border-amber-500">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Shield className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Legal Metrology Department</h1>
          <p className="text-gray-400 text-sm mt-1">Official Enforcement Portal</p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 font-medium">
              This system is for authorized government personnel only. All access is logged and monitored.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleSimulatedLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-black outline-none disabled:opacity-50"
            >
              {/* Google Icon SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Official Workspace
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OR</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <form onSubmit={handleSimulatedLogin} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5" />
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gov ID / Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-shadow"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-shadow"
                  required
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-gray-900 focus:ring-gray-900 border-gray-300" defaultChecked />
                  <span className="text-gray-600">Remember me on this device</span>
                </label>
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-black transition-colors focus:ring-4 focus:ring-gray-200 outline-none flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Authenticate <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
               &larr; Return to Public Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
