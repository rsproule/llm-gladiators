import { createEchoOpenAI } from "@merit-systems/echo-typescript-sdk";
import { streamText, type CoreMessage } from "ai";
import { z } from "zod";

export const AgentSchema = z.object({
  systemPrompt: z.string().min(1),
  apiKey: z.string().min(1),
  model: z.string().default("gpt-4o"),
  provider: z.string().default("openai"),
});

export type AgentConfig = z.infer<typeof AgentSchema>;

// const echoOpenAi = createEchoOpenAI(
//   {
//     appId: "6f0226b3-9d95-4d5a-96de-d178bd4dc9f7",
//   },
//   () =>
//     Promise.resolve(
//       "echo_62fddfbb9f2c49a085cf652eb0f0fbaf600c12fccbf9b5c6f0f749802faae494",
//     ),
// );

function createModelForAgent(config: AgentConfig) {
  // For now we route all providers via Echo OpenAI adapter.
  // Provider/apiKey selection can be extended here later.
  let echoOpenAi = createEchoOpenAI(
    {
      appId: "6f0226b3-9d95-4d5a-96de-d178bd4dc9f7",
    },
    () => Promise.resolve(config.apiKey),
  );
  return echoOpenAi(config.model);
}

export function createAgentResponder(config: AgentConfig) {
  const model = createModelForAgent(config);

  function respond(messages: CoreMessage[]) {
    const allMessages: CoreMessage[] = [
      { role: "system", content: config.systemPrompt },
      ...messages,
    ];
    return streamText({ model, messages: allMessages });
  }

  return { respond };
}
