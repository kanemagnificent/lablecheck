"use client";

import React, { useState } from 'react';
import { useAppStore } from '../../../context/store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ManufacturerProducts() {
  const { scans } = useAppStore();
  const [selectedProduct, setSelectedProduct] = useState('Acme Chips');

  // Mock trend data showing improvement after a corrective action
  const trendData = [
    { date: 'Jan 10', score: 65, status: 'WARNING' },
    { date: 'Feb 15', score: 65, status: 'WARNING' },
    { date: 'Mar 22', score: 65, status: 'WARNING', event: 'Notice Issued' },
    { date: 'Apr 05', score: 100, status: 'COMPLIANT', event: 'Correction Accepted' },
    { date: 'May 10', score: 100, status: 'COMPLIANT' },
    { date: 'Jun 12', score: 100, status: 'COMPLIANT' }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg text-xs">
          <p className="font-bold mb-1">{label}</p>
          <p>Score: <span className={data.score === 100 ? 'text-green-400' : 'text-amber-400'}>{data.score}</span></p>
          {data.event && <p className="mt-1 text-blue-300 bg-blue-900/30 px-1.5 py-0.5 rounded inline-block">{data.event}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Product Compliance History</h1>
        <p className="text-gray-500">Track the compliance scores of your product lines over time.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            {['Acme Chips', 'Acme Soap', 'Acme Oil'].map(prod => (
              <button 
                key={prod}
                onClick={() => setSelectedProduct(prod)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedProduct === prod ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {prod}
              </button>
            ))}
          </div>
          <div className="text-right">
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current Score</span>
            <span className="text-2xl font-bold text-green-500">100/100</span>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#111827" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#111827' }}
                activeDot={{ r: 6, fill: '#111827' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
