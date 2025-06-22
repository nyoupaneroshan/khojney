// src/app/page.tsx

// 1. Import your new utility function.
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Import your client component and types
import HomeClient from './home-client';
import { Category } from './types';
import { Session } from '@supabase/supabase-js'; // Import Session type

// This is our Server Component.
export default async function Home() {

  // 2. Use the utility to get the pre-configured Supabase client. This is the fix.
  const supabase = createSupabaseServerClient();

  // 3. Fetch the user session on the server.
  const { data: { session } } = await supabase.auth.getSession();

  let categories: Category[] = [];

  // 4. If a user is logged in, fetch the categories.
  if (session) {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name_en, name_ne, slug, description_en, parent_category_id')
      .eq('is_published', true)
      .order('display_order', { ascending: true });
    
    if (error) {
        console.error("Error fetching categories:", error.message);
    } else {
        categories = data || [];
    }
  }

  // 5. Pass the server-fetched data to the client component.
  return (
    <HomeClient session={session as Session | null} initialCategories={categories} />
  );
}
