import { createClient } from "@supabase/supabase-js";

// SERVICE-ROLE client. Server-only. Bypasses RLS. Used by the Stream webhook.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
