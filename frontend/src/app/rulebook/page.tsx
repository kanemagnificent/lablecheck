"use client";

import React from 'react';
import { BookOpen, CheckCircle, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UserRulebookPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-gray-900" /> Shopper's Guide to Packaging Rules
        </h1>
        <p className="text-gray-500">A plain-language guide to what you should always see on a packaged product.</p>
      </div>

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" /> What must be printed on every packet?
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="font-bold text-gray-900 min-w-[120px]">Name & Address:</span>
              <span className="text-gray-600">You have the right to know exactly who manufactured or packed the product so you can contact them if something goes wrong.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-gray-900 min-w-[120px]">Net Quantity:</span>
              <span className="text-gray-600">The weight, measure, or number of items must be clearly stated (e.g., "500g", not just "Large size").</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-gray-900 min-w-[120px]">MRP:</span>
              <span className="text-gray-600">The Maximum Retail Price (inclusive of all taxes). No shopkeeper can charge you more than this printed price.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-gray-900 min-w-[120px]">Contact Info:</span>
              <span className="text-gray-600">A customer care phone number and email address must be printed clearly.</span>
            </li>
          </ul>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-gray-400" /> Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">What if the MRP is missing or hidden?</h4>
              <p className="text-sm text-gray-600">It is illegal to sell a packaged commodity without a printed MRP, or to stick a new price tag over the original manufacturer's printed MRP.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">What can I do if I find a violation?</h4>
              <p className="text-sm text-gray-600">You can use the <strong>Scan</strong> feature on this app. If our system detects a violation, you can click "Report to Enforcement" to flag it directly to the Legal Metrology department.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
