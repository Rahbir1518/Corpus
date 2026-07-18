import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client (service role). Returns null when env is not
// configured yet, so the app can fall back to seed data during early dev.
let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  cached = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cached;
}

// Public (anon) client config for the browser — used for Realtime subscriptions.
export const supabasePublicConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};
