import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function createClient() {
  if (client) {
    return client;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  client = createSupabaseClient(supabaseUrl!, publishableKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  return client;
}
