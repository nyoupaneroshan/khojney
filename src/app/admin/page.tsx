// src/app/admin/page.tsx

import { createServerClient } from '@supabase/ssr';

import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import AdminClient from './admin-client';
import { Database } from '@/types/supabase';

// This is a SERVER COMPONENT that secures the route
export default async function AdminPage() {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    );

  // 1. Check for a logged-in user session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/'); // Or your login page
  }

  // 2. Verify the user's role on the server
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== 'admin') {
    notFound(); // If not an admin, show a 404 page. Secure and clean.
  }

  // 3. Fetch all dashboard stats in parallel for performance
  const [
    { count: userCount },
    { count: questionCount },
    { count: categoryCount },
    { data: recentAttempts, error: attemptsError }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('questions').select('*', { count: 'exact', head: true }),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('quiz_attempts').select('id, score, created_at, profiles(full_name), categories(name_en)').order('created_at', { ascending: false }).limit(5)
  ]);
  
  const stats = {
    users: userCount ?? 0,
    questions: questionCount ?? 0,
    categories: categoryCount ?? 0,
  };

  // 4. Pass the fetched data to the client component for display
  return (
    <AdminClient
      user={session.user}
      stats={stats}
      recentAttempts={recentAttempts || []}
    />
  );
}