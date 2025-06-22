// components/Admin/AdminPageLayout.tsx (example path)
// 'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const AdminLoading = () => (
  <main className="flex min-h-screen w-full items-center justify-center">
    <p className="text-lg text-gray-400">Verifying permissions...</p>
  </main>
);

const AccessDenied = () => (
  <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
    <div className="bg-red-900/50 border border-red-700 p-8 rounded-lg max-w-md">
        <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
        <p className="text-red-300 mb-6">You do not have the required permissions to view this page.</p>
        <Link href="/" className="inline-block bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Go to Homepage
        </Link>
    </div>
  </main>
);

export default function AdminPageLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Assume you have a 'profiles' table with a 'role' column.
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role === 'admin') {
          setIsAuthorized(true);
        }
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  if (loading) return <AdminLoading />;
  if (!isAuthorized) return <AccessDenied />;

  // If authorized, render the actual page content
  return <>{children}</>;
}