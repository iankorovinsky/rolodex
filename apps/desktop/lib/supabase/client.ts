import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return createBrowserClient(supabaseUrl!, publishableKey!);
}
