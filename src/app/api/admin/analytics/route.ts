// src/app/api/admin/analytics/route.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from '@/types/supabase';
import { subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  const supabase = createServerClient<Database>({ cookies: () => request.cookies });
  const { searchParams } = new URL(request.url);
  
  // --- NEW: Read date range and userId from params ---
  const userId = searchParams.get('userId') || 'all';
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : subDays(to, 30);

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user?.app_metadata.role !== 'admin') {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
    }

    // --- NEW: Fetch all data points in parallel ---
    const [
      attemptsRes,
      questionStatsRes,
      userSignupsRes,
      leaderboardRes
    ] = await Promise.all([
      // 1. Quiz attempts within date range
      supabase.from('quiz_attempts').select('score, created_at, categories(name_en)')
        .eq('status', 'completed')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .if(userId !== 'all', (query) => query.eq('user_id', userId)),
      // 2. Question stats
      supabase.from('question_stats').select('question_id, correct_percentage, total_attempts, questions(question_text_en)'),
      // 3. New user signups
      supabase.from('profiles').select('created_at')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString()),
      // 4. Leaderboard data
      supabase.from('profiles').select('full_name, id')
        .order('total_score', { ascending: false, nulls: 'last' }).limit(10) // Example: simple leaderboard
    ]);

    if (attemptsRes.error) throw attemptsRes.error;
    
    // --- Process all data on the server ---
    const attempts = attemptsRes.data || [];
    // ... (All the existing data processing logic for KPIs, category charts, activity charts)

    const questionStats = {
        hardest: questionStatsRes.data?.sort((a,b) => a.correct_percentage - b.correct_percentage).slice(0, 5) || [],
        easiest: questionStatsRes.data?.sort((a,b) => b.correct_percentage - a.correct_percentage).slice(0, 5) || [],
    };

    const userSignupsByDay = (userSignupsRes.data || []).reduce((acc, u) => {
        const date = new Date(u.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const userSignupChartData = Object.entries(userSignupsByDay)
      .map(([date, count]) => ({ date, "New Users": count }))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const analyticsData = {
        kpis: { /* ... */ },
        categoryChartData: [ /* ... */ ],
        activityChartData: [ /* ... */ ],
        questionStats,
        leaderboardData: leaderboardRes.data || [],
        userSignupChartData,
    };
    
    return NextResponse.json(analyticsData);
  } catch (e: any) {
    return new NextResponse(JSON.stringify({ error: e.message }), { status: 500 });
  }
}