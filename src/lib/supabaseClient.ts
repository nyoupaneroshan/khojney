// src/lib/supabaseClient.ts

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

// This function creates a single, reusable client instance for the browser.
// All client components will import this instance.
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)