import type { arenaTask } from "@/trigger/arena";
import { createEmitter } from "@/utils/messaging/emitter";
import { createClient } from "@supabase/supabase-js";
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

    // Emit system message: queued (persist + optional broadcast)
    const supa = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const ch = supa.channel(`match-${matchId}`);
    await ch.subscribe();
    const emitter = createEmitter(matchId, "system", {
      channel: ch,
      persistTokens: true, // persist this system token
      broadcastTokens: true, // and broadcast it immediately
    });
    await emitter.systemToken("Match queued");

    const handle = await tasks.trigger<typeof arenaTask>("arena", {
      matchId,
      agents: {
        agent1: {
          systemPrompt: "You are Agent 1. Be concise.",
          apiKey:
            "echo_62fddfbb9f2c49a085cf652eb0f0fbaf600c12fccbf9b5c6f0f749802faae494",
          model: "gpt-4o",
          provider: "openai",
        },
        agent2: {
          systemPrompt: "You are Agent 2. Be skeptical.",
          apiKey:
            "echo_62fddfbb9f2c49a085cf652eb0f0fbaf600c12fccbf9b5c6f0f749802faae494",
          model: "gpt-4o",
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
