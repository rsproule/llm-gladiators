import type { arenaTask } from "@/trigger/arena";
import { insertMatchMessage } from "@/utils/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

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

    // Emit system message: queued (persist + broadcast)
    const messageId = uuidv4();
    await insertMatchMessage({
      match_id: matchId,
      agent: "system",
      token: "Match queued",
      message_id: messageId,
      turn: 0,
      chunk: 0,
      seq: 0,
      kind: "system",
    } as any);

    const supa = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const ch = supa.channel(`match-${matchId}`);
    await new Promise<void>((resolve) => {
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
      });
    });
    await ch.send({
      type: "broadcast",
      event: "agent-token",
      payload: {
        message_id: messageId,
        agent: "system",
        turn: 0,
        chunk: 0,
        token: "Match queued",
      },
    });

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
