// src/app/quiz/results/[attemptId]/page.tsx

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Database } from '@/types/supabase';
import type { Metadata } from 'next';
import ResultsClient from './results-client';

// The parameter name is updated here
interface PageParams {
  attemptId: string;
}

// DYNAMIC SEO & SOCIAL SHARING METADATA
// The parameter name is updated here
export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
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
  const { data: attempt } = await supabase.from('quiz_attempts')
    .select(`score, categories(name_en)`)
    // The parameter is now read from params.attemptId
    .eq('id', params.attemptId).single();
    
  if (!attempt) {
    return { title: 'Quiz Result Not Found' };
  }
  
  const title = `My Quiz Result: ${attempt.score} in ${attempt.categories?.name_en || 'General Knowledge'}!`;
  const description = 'I took a quiz on Khojney App! Check out my score and try to beat it.';

  return { title, description };
}

// MAIN SERVER COMPONENT
// The parameter name is updated here
export default async function ResultsPage({ params }: { params: PageParams }) {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // The parameter is now read directly from params.attemptId
  const { attemptId } = params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/');
  }
  
  const { data: attemptData, error } = await supabase
    .from('quiz_attempts')
    .select(`
        *,
        categories(name_en),
        user_answers(
            question_id,
            selected_option_id,
            questions(
                id,
                question_text_en,
                explanation_en,
                options(id, option_text_en, is_correct)
            )
        )
    `)
    // The parameter is now read from the `attemptId` const
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .single();
    
  if (error || !attemptData) {
    notFound();
  }

  const totalQuestions = attemptData.user_answers.length;
  const correctAnswers = attemptData.score || 0;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const timePerQuestion = totalQuestions > 0 && attemptData.time_taken_seconds
    ? (attemptData.time_taken_seconds / totalQuestions).toFixed(1)
    : 0;

  const stats = {
      totalQuestions,
      correctAnswers,
      accuracy,
      timeTaken: attemptData.time_taken_seconds,
      timePerQuestion,
      categoryName: attemptData.categories?.name_en || 'Quiz',
      completedAt: attemptData.completed_at,
  };

  return (
    <ResultsClient
      // The prop being passed is still named `attemptId`
      attemptId={attemptId}
      stats={stats}
      reviews={attemptData.user_answers}
    />
  );
}