// src/app/leaderboard/page.tsx

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import LeaderboardClient from './LeaderboardClient'; // We will create this next

// This Server Component fetches all the necessary data based on URL params
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { period?: string; category?: string };
}) {
  const cookieStore = cookies();
  // const cookieStore = cookies();
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

  // Determine the current filters from the URL, with defaults
  const selectedPeriod = searchParams.period || 'all_time';
  const selectedCategory = searchParams.category || null;

  // 1. Fetch the list of categories for the dropdown menu
  const { data: categories } = await supabase.from('categories').select('id, name_en');


  // 2. Fetch the main leaderboard data, applying the period and category filters
  let query = supabase
    .from('leaderboards')
    .select('rank, user_id, total_score, full_name')
    .eq('period', selectedPeriod);

  if (selectedCategory) {
    query = query.eq('category_id', selectedCategory);
  } else {
    // For global leaderboards, category_id is NULL
    query = query.is('category_id', null);
  }

  const { data: users, error } = await query.order('rank', { ascending: true }).limit(100);

  // 3. Fetch the currently logged-in user's rank for the current view
  const { data: { session } } = await supabase.auth.getSession();
  let userRank = null;
  if (session?.user) {
    const { data } = await supabase.rpc('get_user_rank', {
      p_user_id: session.user.id,
      p_period: selectedPeriod,
      p_category_id: selectedCategory,
    });
    if (data && data.length > 0) {
      userRank = data[0];
    }
  }

  if (error) {
    console.error('Error fetching leaderboard data:', error);
  }

  // Pass all the fetched data to the client component for rendering
  return (
    <LeaderboardClient
      leaderboardUsers={users || []}
      categories={categories || []}
      currentPeriod={selectedPeriod}
      currentCategory={selectedCategory}
      userRank={userRank}
    />
  );
}