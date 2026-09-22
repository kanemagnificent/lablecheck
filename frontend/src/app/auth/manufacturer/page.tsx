"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Factory, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '../../../context/store';

export default function ManufacturerAuth() {
  const router = useRouter();
  const login = useAppStore(state => state.login);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("compliance@acmecorp.com");
  const [password, setPassword] = useState("password123");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSimulatedLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setErrorMsg("Please enter a valid company email.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    
    setErrorMsg("");
    setIsLoading(true);
    setTimeout(() => {
      login('MANUFACTURER');
      router.push('/manufacturer/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Left Side: Branding / Info */}
        <div className="bg-gray-900 text-white p-12 flex flex-col justify-between hidden md:flex">
          <div>
            <div className="flex items-center gap-2 mb-12">
              <CheckCircle className="text-white w-8 h-8" />
              <span className="font-bold text-2xl tracking-tight">LabelCheck</span>
            </div>
            <h2 className="text-3xl font-semibold mb-6 leading-tight">Streamline Your Compliance Workflow</h2>
            <p className="text-gray-400 leading-relaxed mb-8">
              The LabelCheck Manufacturer Portal allows you to respond to enforcement notices, upload revised artwork, and track your brand's compliance health across India.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">1</div>
                Receive real-time violation notices
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">2</div>
                Submit corrective action plans
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">3</div>
                Monitor product portfolio compliance
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            © 2024 Legal Metrology Engine
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8 text-center md:text-left">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-6 mx-auto md:mx-0">
              <Factory className="w-6 h-6 text-gray-900" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Manufacturer Portal</h1>
            <p className="text-gray-500">Sign in to manage your company's compliance.</p>
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
              Sign in with Google
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">or continue with email</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <form onSubmit={handleSimulatedLogin} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
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
                  <span className="text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-blue-600 hover:underline font-medium">Forgot password?</a>
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-black transition-colors focus:ring-4 focus:ring-gray-200 outline-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don't have an account? <a href="#" className="text-gray-900 font-medium hover:underline">Register your company</a>
          </p>
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
               &larr; Back to Public Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
