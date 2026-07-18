"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Browser (anon) client for Realtime. Returns null when env is absent so the
// dashboard falls back to the local manual recall.
let client: SupabaseClient | null | undefined;

export function getBrowserSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}
