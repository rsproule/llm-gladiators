import { AgentSchema, createAgentResponder } from "@/agents/responder";
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
    live.subscribe();

    const makeEmitter = (
      agent: AgentLabel | SystemLabel,
      context: { turn?: number; messageId?: string; startSeq?: number } = {},
    ) => createEmitter(payload.matchId, agent, context);

    // Optional kickoff system message
    const sys = makeEmitter("system");
    await sys.systemToken("Arena started: double agent loop running");

    // Prepare agents
    const agent1 = createAgentResponder(payload.agents.agent1);
    const agent2 = createAgentResponder(payload.agents.agent2);

    // Conversation history and loop config
    const conversation: ArenaMessage[] = [
      {
        agent: "system",
        content: "Begin the discussion. Keep replies concise.",
      },
      { agent: "agent2", content: "Please open the debate." },
    ];

    const totalTurns = 4; // 2 turns each by default

    for (let turn = 0; turn < totalTurns; turn++) {
      console.log("conversation step start", turn);
      const label: AgentLabel = turn % 2 === 0 ? "agent1" : "agent2";
      const emitter = makeEmitter(label, { turn });
      const responder = label === "agent1" ? agent1 : agent2;
      console.log("responder", label);

      const coreMessages: CoreMessage[] = mapConversationForAgent(
        conversation,
        label,
      );
      const stream = responder.respond(coreMessages);
      console.log("stream started");

      let full = "";
      let chunkIndex = 0;
      for await (const chunk of stream.textStream) {
        full += chunk;
        await live.send({
          type: "broadcast",
          event: "agent-token",
          payload: {
            message_id: emitter.id,
            agent: label,
            turn: emitter.turn,
            chunk: chunkIndex++,
            token: chunk,
          },
        });
      }
      await live.send({
        type: "broadcast",
        event: "agent-final",
        payload: { message_id: emitter.id },
      });
      await emitter.final(full);
      conversation.push({ agent: label, content: full });
      console.log("conversation step complete", turn);
    }

    // Notify clients to stop listening (optional)
    await live.send({
      type: "broadcast",
      event: "arena-complete",
      payload: {},
    });

    await sys.systemToken("Arena task completed");
    return { ok: true };
  },
});
