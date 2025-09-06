import type { arenaTask } from "@/trigger/arena";
import { insertMatchMessage } from "@/utils/supabase/admin";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";

type PostBody = {
  matchId: string;
};

export async function POST(req: Request) {
  try {
    const { matchId } = (await req.json()) as PostBody;
    console.log("matchId", matchId);

    if (!matchId) {
      return NextResponse.json(
        { ok: false, error: "matchId is required" },
        { status: 400 },
      );
    }

    // Emit system message: queued
    await insertMatchMessage({
      match_id: matchId,
      agent: "system",
      seq: 0,
      token: "Match queued",
    });

    const handle = await tasks.trigger<typeof arenaTask>("arena", {
      matchId,
      agents: {
        agent1: {
          systemPrompt: "You are Agent 1. Be concise.",
          apiKey: "TODO: echo_api_key",
          model: "gpt-5",
          provider: "openai",
        },
        agent2: {
          systemPrompt: "You are Agent 2. Be skeptical.",
          apiKey: "TODO: echo_api_key",
          model: "gpt-5",
          provider: "openai",
        },
      },
    });

    return NextResponse.json({ ok: true, handle });
  } catch (error) {
    console.error("error", error);
    return NextResponse.json({ ok: false, error: `${error}` }, { status: 500 });
  }
}
