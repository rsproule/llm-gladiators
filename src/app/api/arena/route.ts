import { getUser, isSignedIn } from "@/echo";
import type { arenaTask } from "@/trigger/arena";
import { createEmitter } from "@/utils/messaging/emitter";
import { createClient } from "@supabase/supabase-js";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";

type PostBody = {
  matchId: string;
  offenseGladiatorId: string;
  defenseGladiatorId: string;
};

export async function POST(req: Request) {
  try {
    const { matchId, offenseGladiatorId, defenseGladiatorId } =
      (await req.json()) as PostBody;
    console.log("matchId", matchId);

    if (!matchId) {
      return NextResponse.json(
        { ok: false, error: "matchId is required" },
        { status: 400 },
      );
    }

    if (!offenseGladiatorId || !defenseGladiatorId) {
      return NextResponse.json(
        { ok: false, error: "Both gladiator IDs are required" },
        { status: 400 },
      );
    }

    // Get user for match creation tracking
    const signedIn = await isSignedIn();
    const user = signedIn ? await getUser() : null;

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
        offenseId: offenseGladiatorId,
        defenseId: defenseGladiatorId,
      },
      createdBy: user?.id,
    });

    return NextResponse.json({ ok: true, handle });
  } catch (error) {
    console.error("error", error);
    return NextResponse.json({ ok: false, error: `${error}` }, { status: 500 });
  }
}
