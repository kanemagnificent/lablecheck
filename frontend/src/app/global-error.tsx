"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In a real app, log to Sentry or Datadog here
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50 flex items-center justify-center min-h-screen p-4`}>
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">System Error</h2>
          <p className="text-gray-500 mb-8 text-sm">
            We experienced a critical application error. Our engineering team has been notified.
          </p>
          <button
            onClick={() => reset()}
            className="w-full bg-gray-900 text-white font-medium px-6 py-3 rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
