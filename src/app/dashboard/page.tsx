// src/app/dashboard/page.tsx

// 1. Import the utility function, NOT createServerClient directly
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';
import { User } from '@supabase/supabase-js';

// This is the corrected and fully enhanced Server Component.
export default async function DashboardPage() {
  // 2. Use the utility to create the Supabase client. This is the fix.
  const supabase = createSupabaseServerClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/');
  }
  const userId = session.user.id;

  // --- DATA FETCHING LOGIC (UNCHANGED) ---
  const [
    profileResponse,
    attemptsResponse,
    performanceResponse,
    achievementsResponse
  ] = await Promise.all([
    // 1. Fetch user profile, including streak data
    supabase.from('profiles').select('*').eq('id', userId).single(),

    // 2. Fetch ALL quiz attempts for the user.
    supabase
      .from('quiz_attempts')
      .select(`id, score, status, completed_at, categories ( name_en )`)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false }),

    // 3. Fetch aggregated performance stats from our custom view
    supabase
      .from('user_category_performance')
      .select('category_name, correct_answers, total_questions_answered')
      .eq('user_id', userId)
      .order('total_questions_answered', { ascending: false }),

    // 4. Fetch the 3 most recently earned achievements
    supabase
      .from('user_achievements')
      .select(`
        earned_at,
        achievements ( name, description, icon_url )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
      .limit(3),
  ]);
  
  // --- SERVER-SIDE STATS CALCULATION (UNCHANGED) ---
  const allAttempts = attemptsResponse.data || [];
  const completedAttempts = allAttempts.filter(a => a.status === 'completed');
  const performanceData = performanceResponse.data || [];

  const totalCorrect = performanceData.reduce((sum, p) => sum + (p.correct_answers || 0), 0);
  const totalQuestionsAnswered = performanceData.reduce((sum, p) => sum + (p.total_questions_answered || 0), 0);
  const accuracy = totalQuestionsAnswered > 0 ? parseFloat(((totalCorrect / totalQuestionsAnswered) * 100).toFixed(1)) : 0;
  
  const overallStats = { 
    total_quizzes: allAttempts.length,
    total_questions: totalQuestionsAnswered, 
    accuracy 
  };

  return (
    <DashboardClient
      user={session.user as User}
      initialProfile={profileResponse.data}
      initialAttempts={allAttempts}
      categoryPerformance={performanceData}
      recentAchievements={achievementsResponse.data || []}
      overallStats={overallStats}
    />
  );
}
