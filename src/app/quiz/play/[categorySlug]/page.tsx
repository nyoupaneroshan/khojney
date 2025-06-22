// src/app/quiz/play/[categorySlug]/page.tsx

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import QuizPlayClient from './quiz-play-client';
import { Database } from '@/types/supabase';
import { Question } from './types';

// This Server Component now fetches questions AND available quiz modes
export default async function QuizPlayPage({
  params,
  searchParams,
}: {
  params: { categorySlug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // We don't need set/remove here as this page doesn't modify the session
      },
    }
  );

  // 1. Get User and check role (could also be done in middleware or a layout)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/');
  }

  // 2. Fetch all necessary data in parallel
  const [categoryRes, modesRes] = await Promise.all([
    supabase
      .from('categories')
      .select(`
        id, name_en, slug,
        questions (
          id, question_text_en, difficulty_level, question_type,
          options ( id, question_id, option_text_en, is_correct )
        )
      `)
      .eq('slug', params.categorySlug)
      .eq('is_published', true)
      .single(),
    supabase
      .from('quiz_modes')
      .select('*')
      .eq('is_active', true)
  ]);

  if (categoryRes.error || !categoryRes.data) {
    notFound();
  }
  
  // 3. Filter questions on the server based on URL params
  const difficulty = searchParams.difficulty || 'all';
  const limit = Number(searchParams.limit) || 10;

  let questions = categoryRes.data.questions;
  if (difficulty !== 'all') {
    questions = questions.filter(q => q.difficulty_level === difficulty);
  }
  
  const limitedQuestions = questions.slice(0, limit);

  return (
    <QuizPlayClient
      category={categoryRes.data}
      initialQuestions={limitedQuestions}
      user={session.user}
      quizModes={modesRes.data || []} // Pass the quiz modes to the client
    />
  );
}