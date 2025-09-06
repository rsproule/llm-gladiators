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
        offense: {
          systemPrompt: BASIC_STRATEGY,
          apiKey:
            "echo_62fddfbb9f2c49a085cf652eb0f0fbaf600c12fccbf9b5c6f0f749802faae494",
          model: "gpt-4o",
          provider: "openai",
        },
        defense: {
          systemPrompt: BASIC_STRATEGY,
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

const BASIC_STRATEGY = `
Game rules:
- The game is a simple word guessing manipulation game.
- The game is played in turns.

Roles:
Offense: offensive player knows the target word, the goal is to get the defense to say the target word by accident.
Strategy: the offensive player should manipulate the defense to say the target word by dancing around the topic. Do not help the defense guess the target word.

Defense: defensive player does not know the target word, the goal is to avoid saying the target word. If the defensive player knows the target word, they should say Guess: "<target word>". in quotes 
if they guess correctly, they win the game. If they guess incorrectly, they lose the game.
Strategy: the defense should try to deduce the target word by asking questions and manipulating the offensive player.
`;
