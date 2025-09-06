import {
  insertMatchMessage,
  type MatchMessageInsert,
} from "@/utils/supabase/admin";
import { v4 as uuidv4 } from "uuid";

export type AgentRole = "offense" | "defense" | "system";

export type Emitter = {
  id: string;
  turn: number;
  token: (frame: string) => Promise<void>;
  final: (finalText?: string) => Promise<void>;
  systemToken: (text: string) => Promise<void>;
};

type BroadcastChannel = {
  send: (message: {
    type: "broadcast";
    event: string;
    payload: Record<string, unknown>;
  }) => Promise<unknown>;
} | null;

export function generateMessageId(): string {
  return uuidv4();
}

export function createEmitter(
  matchId: string,
  agent: AgentRole,
  options?: {
    turn?: number;
    messageId?: string;
    startSeq?: number;
    channel?: BroadcastChannel;
    persistTokens?: boolean; // default false: only finals persisted for streams
    broadcastTokens?: boolean; // default false: only finals broadcast for streams
    sourceId?: string; // identifier for this run/broadcaster
  },
): Emitter {
  const id = options?.messageId ?? generateMessageId();
  const turn = options?.turn ?? 0;
  let chunk = 0;
  let seq = options?.startSeq ?? 0;
  let finalWritten = false;
  const channel = options?.channel ?? null;
  const persistTokens = options?.persistTokens ?? false;
  const broadcastTokens = options?.broadcastTokens ?? false;
  const sourceId = options?.sourceId;

  return {
    id,
    turn,
    async token(frame: string) {
      const thisChunk = chunk++;
      const thisSeq = seq++;
      if (persistTokens) {
        await insertMatchMessage({
          match_id: matchId,
          agent,
          token: frame,
          message_id: id,
          turn,
          chunk: thisChunk,
          seq: thisSeq,
          kind: "token",
        } satisfies MatchMessageInsert);
      }
      if (channel && broadcastTokens) {
        await channel.send({
          type: "broadcast",
          event: "agent-token",
          payload: {
            message_id: id,
            agent,
            turn,
            chunk: thisChunk,
            token: frame,
            source_id: sourceId,
          },
        });
      }
    },
    async final(finalText?: string) {
      if (finalWritten) return;
      finalWritten = true;
      const thisChunk = chunk++;
      const thisSeq = seq++;
      await insertMatchMessage({
        match_id: matchId,
        agent,
        token: finalText ?? "",
        message_id: id,
        turn,
        chunk: thisChunk,
        seq: thisSeq,
        kind: "final",
      } satisfies MatchMessageInsert);
      if (channel) {
        await channel.send({
          type: "broadcast",
          event: "agent-final",
          payload: { message_id: id, source_id: sourceId },
        });
      }
    },
    async systemToken(text: string) {
      const thisChunk = chunk++;
      const thisSeq = seq++;
      await insertMatchMessage({
        match_id: matchId,
        agent: "system",
        token: text,
        message_id: id,
        turn: 0,
        chunk: thisChunk,
        seq: thisSeq,
        kind: "system",
      } satisfies MatchMessageInsert);
      if (channel) {
        await channel.send({
          type: "broadcast",
          event: "agent-token",
          payload: {
            message_id: id,
            agent: "system",
            turn: 0,
            chunk: thisChunk,
            token: text,
            source_id: sourceId,
          },
        });
      }
    },
  };
}
