import { AgentSchema, createAgentResponder } from "@/agents/responder";
import { getTabooWord, getWinner } from "@/taboo/game";
import { createEmitter } from "@/utils/messaging/emitter";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { schemaTask } from "@trigger.dev/sdk";
import { type CoreMessage } from "ai";
import { z } from "zod";

// Agent schema and responder are defined in src/agents/responder

type AgentLabel = "offense" | "defense";
type SystemLabel = "system";
type ArenaMessage = { agent: AgentLabel | SystemLabel; content: string };

function mapConversationForAgent(
  conversation: ArenaMessage[],
  self: AgentLabel,
): CoreMessage[] {
  return conversation.map((m) => {
    if (m.agent === "system") return { role: "system", content: m.content };
    if (m.agent === self) return { role: "assistant", content: m.content };
    return { role: "user", content: m.content };
  });
}

// Responder logic extracted to src/agents/responder

export const arenaTask = schemaTask({
  id: "arena",
  schema: z.object({
    matchId: z.string().min(1),
    agents: z.object({
      offenseId: z.string().uuid(),
      defenseId: z.string().uuid(),
    }),
    createdBy: z.string().optional(), // Echo user ID who created the match
  }),
  run: async (payload) => {
    // Setup Realtime Broadcast channel for live tokens
    const supa = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const live = supa.channel(`match-${payload.matchId}`);
    live.subscribe();

    // Fetch gladiator configurations from database
    const adminSupa = createAdminClient();

    const { data: offenseGladiator, error: offenseError } = await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adminSupa as any
    )
      .from("gladiator_agents")
      .select("*")
      .eq("id", payload.agents.offenseId)
      .eq("is_public", true)
      .single();

    const { data: defenseGladiator, error: defenseError } = await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adminSupa as any
    )
      .from("gladiator_agents")
      .select("*")
      .eq("id", payload.agents.defenseId)
      .eq("is_public", true)
      .single();

    if (offenseError || !offenseGladiator) {
      throw new Error(
        `Offense gladiator not found or not public: ${payload.agents.offenseId}`,
      );
    }

    if (defenseError || !defenseGladiator) {
      throw new Error(
        `Defense gladiator not found or not public: ${payload.agents.defenseId}`,
      );
    }

    // Convert gladiator DB rows to AgentConfig format
    const offenseConfig: z.infer<typeof AgentSchema> = {
      systemPrompt: offenseGladiator.system_prompt,
      apiKey: offenseGladiator.echo_api_key,
      model: offenseGladiator.model,
      provider: offenseGladiator.provider,
    };

    const defenseConfig: z.infer<typeof AgentSchema> = {
      systemPrompt: defenseGladiator.system_prompt,
      apiKey: defenseGladiator.echo_api_key,
      model: defenseGladiator.model,
      provider: defenseGladiator.provider,
    };

    // Game setup (private to agents via per-turn system prompts)
    const targetWord = getTabooWord();

    // Create match record with target word and agent references
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupa as any).from("matches").insert({
      match_id: payload.matchId,
      status: "running",
      target_word: targetWord,
      total_turns: 0,
      started_at: new Date().toISOString(),
      created_by: payload.createdBy,
      offense_agent_id: payload.agents.offenseId,
      defense_agent_id: payload.agents.defenseId,
    });

    const makeEmitter = (
      agent: AgentLabel | SystemLabel,
      context: { turn?: number; messageId?: string; startSeq?: number } = {},
    ) =>
      createEmitter(payload.matchId, agent, {
        ...context,
        channel: live,
        persistTokens: false, // only finals persisted
        broadcastTokens: true, // stream tokens over broadcast
        sourceId: `arena:${payload.matchId}`,
      });

    const sysStart = makeEmitter("system", { turn: -1 });
    await sysStart.systemToken("Match started with target word: " + targetWord);

    const offense: AgentLabel = "offense";

    // Prepare agents using fetched gladiator configs
    const offenseResponder = createAgentResponder(offenseConfig);
    const defenseResponder = createAgentResponder(defenseConfig);

    // Conversation history and loop config (shared messages only)
    const conversation: ArenaMessage[] = [];

    const totalTurns = 40; // 20 turns each by default

    let turn = 0;
    for (; turn < totalTurns; turn++) {
      const label: AgentLabel = turn % 2 === 0 ? "offense" : "defense";
      const emitter = makeEmitter(label, { turn });
      const responder =
        label === "offense" ? offenseResponder : defenseResponder;

      const sharedMessages: CoreMessage[] = mapConversationForAgent(
        conversation,
        label,
      );
      const privateRolePrompt: CoreMessage[] =
        label === offense
          ? [
              {
                role: "system",
                content:
                  'You are Offense. The target word is: "' + targetWord + '".',
              },
            ]
          : [
              {
                role: "system",
                content: "You are Defense.",
              },
            ];
      const coreMessages: CoreMessage[] = [
        ...privateRolePrompt,
        ...sharedMessages,
      ];
      const stream = responder.respond(coreMessages);

      let full = "";
      for await (const chunk of stream.textStream) {
        full += chunk;
        await emitter.token(chunk);
      }
      await emitter.final(full);
      conversation.push({ agent: label, content: full });

      const { winner, reason } = getWinner(full, targetWord, label);
      if (winner) {
        const sysWin = makeEmitter("system");
        await sysWin.systemToken(`${winner} wins! ${reason}`);

        // Update match record with result
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (adminSupa as any)
          .from("matches")
          .update({
            status: "completed",
            winner,
            winner_reason: reason,
            target_word: targetWord,
            total_turns: turn + 1,
            completed_at: new Date().toISOString(),
          })
          .eq("match_id", payload.matchId);
        break;
      }
    }

    if (turn === totalTurns) {
      const sysWin = makeEmitter("system");
      await sysWin.systemToken("Tie! The target word was: " + targetWord);

      // Update match record for tie
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminSupa as any)
        .from("matches")
        .update({
          status: "completed",
          winner: "tie",
          winner_reason: "Maximum turns reached",
          target_word: targetWord,
          total_turns: totalTurns,
          completed_at: new Date().toISOString(),
        })
        .eq("match_id", payload.matchId);
    }

    // Notify clients to stop listening (optional)
    await live.send({
      type: "broadcast",
      event: "arena-complete",
      payload: {},
    });

    const sysEnd = makeEmitter("system");
    await sysEnd.systemToken("Game over!");
    return { ok: true };
  },
});
