import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Supabase URL is missing. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in Vercel environment variables."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Supabase anon key is missing. Set SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
