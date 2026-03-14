import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  client = createSupabaseClient(
    supabaseUrl,
    supabaseAnonKey,
  );
  return client;
}
