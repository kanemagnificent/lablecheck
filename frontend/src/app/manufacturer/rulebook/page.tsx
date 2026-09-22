"use client";

import React from 'react';
import { BookOpen, Download, FileCheck, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ManufacturerRulebook() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-gray-900" /> B2B Compliance Hub
          </h1>
          <p className="text-gray-500">The pre-print checklist for Legal Metrology (Packaged Commodities) Rules, 2011.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="hidden sm:flex bg-gray-900 text-white font-medium px-4 py-2 rounded-lg hover:bg-black transition-colors items-center gap-2 shadow-sm"
        >
          <Download className="w-4 h-4" /> Download Checklist PDF
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Rule 6: Mandatory Declarations</h2>
            <p className="text-sm text-gray-500">Every package must bear the following information clearly.</p>
          </div>
        </div>
        <div className="p-6 grid gap-4">
          <ChecklistItem text="Name and complete address of the manufacturer, packer, or importer." />
          <ChecklistItem text="Common or generic name of the commodity." />
          <ChecklistItem text="Net quantity in standard units of weight, measure, or number." />
          <ChecklistItem text="Month and year in which the commodity is manufactured or pre-packed." />
          <ChecklistItem text="Maximum Retail Price (MRP) inclusive of all taxes." />
          <ChecklistItem text="Consumer care details (Name, address, telephone number, and email)." />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
           <h2 className="text-xl font-bold text-gray-900 mb-2">Rule 7: Font Size</h2>
           <p className="text-sm text-gray-500 mb-6">The minimum height of numerals and letters must scale based on the principal display panel area.</p>
           <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
               <tr>
                 <th className="py-2 px-2">Area of Principal Display Panel</th>
                 <th className="py-2 px-2 text-right">Min. Height</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100 text-gray-900 font-mono">
               <tr><td className="py-3 px-2">Up to 50 cm²</td><td className="py-3 px-2 text-right">1.0 mm</td></tr>
               <tr><td className="py-3 px-2">50 cm² - 100 cm²</td><td className="py-3 px-2 text-right">1.5 mm</td></tr>
               <tr><td className="py-3 px-2">100 cm² - 500 cm²</td><td className="py-3 px-2 text-right">2.5 mm</td></tr>
               <tr><td className="py-3 px-2">Above 500 cm²</td><td className="py-3 px-2 text-right">4.0 mm</td></tr>
             </tbody>
           </table>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
           <h2 className="text-xl font-bold text-gray-900 mb-2">Rule 13: Standard Units</h2>
           <p className="text-sm text-gray-500 mb-6">Quantities must be declared using strict standard units.</p>
           <ul className="space-y-4">
             <li className="flex justify-between items-center text-sm"><span className="text-gray-900 font-medium">Solid, Semi-solid, Viscous</span><span className="font-mono bg-gray-100 px-2 py-1 rounded">Weight (g, kg)</span></li>
             <li className="flex justify-between items-center text-sm"><span className="text-gray-900 font-medium">Liquid</span><span className="font-mono bg-gray-100 px-2 py-1 rounded">Volume (ml, L)</span></li>
             <li className="flex justify-between items-center text-sm"><span className="text-gray-900 font-medium">Length</span><span className="font-mono bg-gray-100 px-2 py-1 rounded">Meters (cm, m)</span></li>
             <li className="flex justify-between items-center text-sm"><span className="text-gray-900 font-medium">Count</span><span className="font-mono bg-gray-100 px-2 py-1 rounded">Number (N)</span></li>
           </ul>
        </div>
      </div>
      
      <button 
        onClick={() => window.print()}
        className="sm:hidden w-full bg-gray-900 text-white font-medium px-4 py-3 rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm"
      >
        <Download className="w-4 h-4" /> Download PDF
      </button>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
      <span className="text-gray-700 font-medium leading-relaxed">{text}</span>
    </div>
  );
}
