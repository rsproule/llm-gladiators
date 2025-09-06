import { AgentSchema, createAgentResponder } from "@/agents/responder";
import { getTabooWord, getWinner } from "@/taboo/game";
import { createEmitter } from "@/utils/messaging/emitter";
import { createClient } from "@supabase/supabase-js";
import { schemaTask } from "@trigger.dev/sdk";
import { type CoreMessage } from "ai";
import { z } from "zod";

// Agent schema and responder are defined in src/agents/responder

type AgentLabel = "agent1" | "agent2";
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
      agent1: AgentSchema,
      agent2: AgentSchema,
    }),
  }),
  run: async (payload) => {
    // Setup Realtime Broadcast channel for live tokens
    const supa = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const live = supa.channel(`match-${payload.matchId}`);
    await live.subscribe();

    const makeEmitter = (
      agent: AgentLabel | SystemLabel,
      context: { turn?: number; messageId?: string; startSeq?: number } = {},
    ) =>
      createEmitter(payload.matchId, agent, {
        ...context,
        channel: live,
        persistTokens: false, // only finals persisted
        broadcastTokens: true, // stream tokens over broadcast
      });

    // Game setup (private to agents via per-turn system prompts)
    const targetWord = getTabooWord();
    const offense: AgentLabel = "agent1";
    const defense: AgentLabel = offense === "agent1" ? "agent2" : "agent1";

    // Prepare agents
    const agent1 = createAgentResponder(payload.agents.agent1);
    const agent2 = createAgentResponder(payload.agents.agent2);

    // Conversation history and loop config (shared messages only)
    const conversation: ArenaMessage[] = [];

    const totalTurns = 40; // 20 turns each by default

    for (let turn = 0; turn < totalTurns; turn++) {
      const label: AgentLabel = turn % 2 === 0 ? "agent1" : "agent2";
      const emitter = makeEmitter(label, { turn });
      const responder = label === "agent1" ? agent1 : agent2;

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
      let chunkIndex = 0;
      for await (const chunk of stream.textStream) {
        full += chunk;
        await emitter.token(chunk);
        chunkIndex++;
      }
      await emitter.final(full);
      conversation.push({ agent: label, content: full });

      let { winner, reason } = getWinner(full, targetWord, label);
      if (winner) {
        const sysWin = makeEmitter("system");
        await sysWin.systemToken(`${winner} wins! ${reason}`);
        break;
      }
    }

    // Notify clients to stop listening (optional)
    await live.send({
      type: "broadcast",
      event: "arena-complete",
      payload: {},
    });

    const sysEnd = makeEmitter("system");
    await sysEnd.systemToken("Arena task completed");
    return { ok: true };
  },
});
