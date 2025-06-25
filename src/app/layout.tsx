// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using the standard, built-in Inter font
import './globals.css';
import { AuthProvider } from '@/components/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Khojney App',
  description: 'Your awesome quiz application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AuthProvider>
          {/* We do not render the Navbar here, it's rendered in page.tsx */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}