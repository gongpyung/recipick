import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import type { Database } from '@/lib/supabase/types';

let cachedServerClient: SupabaseClient<Database> | null = null;

export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (cachedServerClient) {
    return cachedServerClient;
  }

  cachedServerClient = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return cachedServerClient;
}
