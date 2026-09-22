import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, actionOnClick }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-xl border border-gray-100 shadow-sm"
    >
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">{title}</h3>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto">{description}</p>
      
      {actionLabel && actionHref && (
        <Link href={actionHref} className="bg-gray-900 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-black transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900">
          {actionLabel}
        </Link>
      )}
      
      {actionLabel && actionOnClick && (
        <button onClick={actionOnClick} className="bg-gray-900 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-black transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900">
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
