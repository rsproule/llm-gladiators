import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type AgentRole = "agent1" | "agent2" | "system";
export type MatchMessageInsert = {
  match_id: string;
  agent: AgentRole;
  seq: number;
  token: string;
};

export async function insertMatchMessage(row: MatchMessageInsert) {
  const supa = createAdminClient();
  const { error } = await supa.from("match_messages").insert(row);
  if (error) throw error;
}
