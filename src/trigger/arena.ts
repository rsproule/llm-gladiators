import { insertMatchMessage } from "@/utils/supabase/admin";
import { schemaTask, wait } from "@trigger.dev/sdk";
import { z } from "zod";

const AgentSchema = z.object({
  systemPrompt: z.string().min(1),
  apiKey: z.string().min(1),
  model: z.string().default("gpt-4o"),
  provider: z.string().default("openai"),
});

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
    // Example: write a few dummy tokens into Supabase for the match stream
    let seq = 0;
    const emit = async (agent: "agent1" | "agent2" | "system", token: string) =>
      insertMatchMessage({
        match_id: payload.matchId,
        agent,
        seq: seq++,
        token,
      });

    await emit("agent1", "Arena task started");
    await wait.for({ seconds: 5 });
    await emit("agent1", "token A");
    await emit("agent2", "token B");
    await wait.for({ seconds: 5 });
    await emit("agent1", "token C");

    await emit("system", "Arena task completed");
    return { ok: true };
  },
});

