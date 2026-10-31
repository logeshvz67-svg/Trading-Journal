import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

// Service-role client: bypasses RLS. Only ever used on the server, and every
// query MUST be scoped with .eq('user_id', userId) taken from a verified JWT.
export const admin: SupabaseClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
