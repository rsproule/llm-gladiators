import type { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

export type MatchMessageInsert =
  Database["public"]["Tables"]["match_messages"]["Insert"];

export async function insertMatchMessage(row: MatchMessageInsert) {
  const supa = createAdminClient();
  const { error } = await supa.from("match_messages").insert(row);
  if (error) throw error;
}
