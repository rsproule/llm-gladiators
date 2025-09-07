import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { matchId: string } },
) {
  try {
    const supa = createAdminClient();

    // Fetch match with gladiator info (exclude API keys)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: match, error } = await (supa as any)
      .from("matches")
      .select(
        `
        id,
        match_id,
        status,
        target_word,
        winner,
        winner_reason,
        total_turns,
        started_at,
        completed_at,
        created_by,
        offense_agent:offense_agent_id(id, name, image_url),
        defense_agent:defense_agent_id(id, name, image_url)
      `,
      )
      .eq("match_id", params.matchId)
      .single();

    if (error || !match) {
      return NextResponse.json(
        { ok: false, error: "Match not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, match });
  } catch (error) {
    console.error("Fetch match error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
