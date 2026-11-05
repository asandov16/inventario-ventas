import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

/**
 * The only Supabase client in the app. Only files in shared/api may import
 * supabase-js (ESLint enforces it); features go through repositories and
 * useRpcMutation. The URL and anon key are public by design (VITE_ prefix).
 */
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';

const url = import.meta.env.VITE_SUPABASE_URL ?? LOCAL_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'missing-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set; see .env.example');
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    // RF-PER-01: the session survives closing the app on a trusted phone.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export type PublicFunctions = Database['public']['Functions'];
export type RpcName = keyof PublicFunctions;
export type RpcArgs<Name extends RpcName> = PublicFunctions[Name]['Args'];
