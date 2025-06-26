// src/app/action/getAnalyticsData.ts

'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '../../types/supabase'; // Using robust relative path

export async function getAnalyticsData(userId: string | 'all') {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { try { cookieStore.set({ name, value, ...options }); } catch (error) {} },
        remove(name: string, options: CookieOptions) { try { cookieStore.set({ name, value: '', ...options }); } catch (error) {} },
      },
    }
  );

  // The query is correct, but the shape of the returned data needs careful handling.
  const query = supabase.from('quiz_attempts').select(`
      score,
      created_at,
      categories ( name_en )
    `)
    .eq('status', 'completed');
    
  if (userId !== 'all') {
      query.eq('user_id', userId);
  }

  const { data: attempts, error } = await query;
  if (error) {
    console.error("Error fetching analytics data from DB:", error.message);
    return null;
  }
  
  // --- Process data on the server ---
  const totalQuizzes = attempts.length;
  const totalScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
  const avgScore = totalQuizzes > 0 ? (totalScore / totalQuizzes) : 0;
  
  const categoryPerformance = attempts.reduce((acc, a) => {
    // --- THIS IS THE FIX ---
    // We now check if `a.categories` is an array and take the first element.
    const categoryArray = a.categories;
    let catName = 'General';
    if (Array.isArray(categoryArray) && categoryArray.length > 0) {
        catName = categoryArray[0].name_en || 'General';
    } else if (categoryArray && !Array.isArray(categoryArray)) {
        // Fallback for cases where it might be a single object
        catName = (categoryArray as { name_en: string }).name_en || 'General';
    }
    // --- END OF FIX ---

    if (!acc[catName]) {
      acc[catName] = { totalScore: 0, count: 0 };
    }
    acc[catName].totalScore += a.score || 0;
    acc[catName].count += 1;
    return acc;
  }, {} as Record<string, { totalScore: number; count: number }>);
  
  const categoryChartData = Object.entries(categoryPerformance).map(([name, data]) => ({
      name,
      avgScore: parseFloat((data.totalScore / data.count || 0).toFixed(1)),
      quizzes: data.count
  })).sort((a,b) => b.quizzes - a.quizzes);

  const attemptsByDay = attempts.reduce((acc, a) => {
      const date = new Date(a.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  const activityChartData = Object.entries(attemptsByDay).map(([date, count]) => ({
      date,
      quizzes: count as number,
  })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Return the fully processed data object
  return {
    kpis: {
        totalQuizzes,
        avgScore: parseFloat(avgScore.toFixed(1)),
        topCategory: categoryChartData[0]?.name || 'N/A'
    },
    categoryChartData,
    activityChartData,
  };
}