// supabase/functions/_shared/cors.ts

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // For development. For production, you should restrict this to your domain.
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };