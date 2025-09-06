import { createEmitter } from "@/utils/messaging/emitter";
import { createEchoOpenAI } from "@merit-systems/echo-typescript-sdk";
import { createClient } from "@supabase/supabase-js";
import { schemaTask } from "@trigger.dev/sdk";
import { streamText } from "ai";
import { z } from "zod";

const AgentSchema = z.object({
  systemPrompt: z.string().min(1),
  apiKey: z.string().min(1),
  model: z.string().default("gpt-4o"),
  provider: z.string().default("openai"),
});

const echoOpenAi = createEchoOpenAI(
  {
    appId: "6f0226b3-9d95-4d5a-96de-d178bd4dc9f7",
  },
  () =>
    Promise.resolve(
      "echo_62fddfbb9f2c49a085cf652eb0f0fbaf600c12fccbf9b5c6f0f749802faae494",
    ),
);

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
    let agent1Turn = 0;

    // factory alias
    const makeEmitter = (
      agent: "agent1" | "agent2" | "system",
      context: { turn?: number; messageId?: string; startSeq?: number } = {},
    ) => createEmitter(payload.matchId, agent, context);

    // Setup Realtime Broadcast channel for live tokens
    const supa = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const live = supa.channel(`match-${payload.matchId}`);
    live.subscribe();

    // Example: stream Agent 1
    const emitter1 = makeEmitter("agent1", { turn: agent1Turn++ });
    const stream = streamText({
      model: echoOpenAi("gpt-5"),
      messages: [
        { role: "system", content: payload.agents.agent1.systemPrompt },
        {
          role: "user",
          content: "write a poem",
        },
      ],
    });

    let full = "";
    let chunkIndex = 0;
    for await (const chunk of stream.textStream) {
      full += chunk;
      await live.send({
        type: "broadcast",
        event: "agent-token",
        payload: {
          message_id: emitter1.id,
          agent: "agent1",
          turn: emitter1.turn,
          chunk: chunkIndex++,
          token: chunk,
        },
      });
    }
    await live.send({
      type: "broadcast",
      event: "agent-final",
      payload: { message_id: emitter1.id },
    });
    await emitter1.final(full);

    // Notify clients to stop listening (optional)
    await live.send({
      type: "broadcast",
      event: "arena-complete",
      payload: {},
    });

    // System message
    const sys = makeEmitter("system");
    await sys.systemToken("Arena task completed");
    return { ok: true };
  },
});
