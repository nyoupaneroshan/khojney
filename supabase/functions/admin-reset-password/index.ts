// supabase/functions/admin-reset-password/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Create client and verify admin status (remains the same)
    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user: adminUser }, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('id', adminUser.id).single();
    if (profileError || profile.role !== 'admin') {
      throw new Error('Permission denied: User is not an admin.');
    }

    // 2. Get the target user's ID (remains the same)
    const { userId } = await req.json();
    if (!userId) {
      throw new Error('User ID is required.');
    }

    // 3. Create Supabase Admin client (remains the same)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 4. NEW: Get the target user's email using their ID
    const { data: { user: targetUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError) throw getUserError;
    if (!targetUser || !targetUser.email) {
      throw new Error("Target user not found or has no email address.");
    }

    // 5. UPDATED: Generate the password reset link using the user's email
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: targetUser.email, // Use email instead of userId
    });
    if (linkError) throw linkError;

    return new Response(JSON.stringify({ message: "Password reset link sent successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});