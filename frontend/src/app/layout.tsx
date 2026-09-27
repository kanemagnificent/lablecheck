import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "../components/AppShell";
import ChatBot from "../components/ChatBot";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LabelCheck | Compliance Scanner",
  description: "Check compliance of Packaged Commodities under Legal Metrology Rules, 2011.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased text-gray-900 bg-white selection:bg-gray-200 selection:text-gray-900`}>
        <Toaster position="bottom-center" toastOptions={{ style: { background: '#111827', color: '#fff', borderRadius: '8px' } }} />
        <AppShell>
          {children}
        </AppShell>
        <ChatBot />
      </body>
    </html>
  );
}
