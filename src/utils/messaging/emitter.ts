import { insertMatchMessage } from "@/utils/supabase/admin";
import { v4 as uuidv4 } from "uuid";

export type AgentRole = "agent1" | "agent2" | "system";

export type Emitter = {
  id: string;
  turn: number;
  token: (frame: string) => Promise<void>;
  final: (finalText?: string) => Promise<void>;
  systemToken: (text: string) => Promise<void>;
};

export function generateMessageId(): string {
  return uuidv4();
}

export function createEmitter(
  matchId: string,
  agent: AgentRole,
  options?: { turn?: number; messageId?: string; startSeq?: number },
): Emitter {
  const id = options?.messageId ?? generateMessageId();
  const turn = options?.turn ?? 0;
  let chunk = 0;
  let seq = options?.startSeq ?? 0;

  return {
    id,
    turn,
    async token(frame: string) {
      await insertMatchMessage({
        match_id: matchId,
        agent,
        token: frame,
        message_id: id,
        turn,
        chunk: chunk++,
        seq: seq++,
        kind: "token",
      } as any);
    },
    async final(finalText?: string) {
      await insertMatchMessage({
        match_id: matchId,
        agent,
        token: finalText ?? "",
        message_id: id,
        turn,
        chunk: chunk++,
        seq: seq++,
        kind: "final",
      } as any);
    },
    async systemToken(text: string) {
      await insertMatchMessage({
        match_id: matchId,
        agent: "system",
        token: text,
        message_id: id,
        turn: 0,
        chunk: chunk++,
        seq: seq++,
        kind: "system",
      } as any);
    },
  };
}
