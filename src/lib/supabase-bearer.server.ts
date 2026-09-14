import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export function bearerClient(token: string): SupabaseClient<Database> {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"]!;
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

export async function requireUser(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  const supabase = bearerClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: allowed } = await supabase.rpc("is_allowed");
  if (!allowed) return null;
  return { supabase, user: data.user, token };
}
